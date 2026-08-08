import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/vouchers/validate/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdVoucherCodes: string[] = [];
const createdOrderIds: string[] = [];

async function createAdminUser() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({ data: { email, passwordHash, name: 'Admin', role: 'ADMIN' } });
}

async function createBuyerCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const buyer = await prisma.user.create({
    data: { email, passwordHash, name: 'Buyer', role: 'BUYER' },
  });
  const { token } = await createSession({ userId: buyer.id });
  return { buyer, cookie: `${SESSION_COOKIE_NAME}=${token}` };
}

async function createVoucher(overrides: Partial<Prisma.VoucherUncheckedCreateInput> = {}) {
  const admin = await createAdminUser();
  const code = `VCH-${randomUUID()}`.toUpperCase();
  createdVoucherCodes.push(code);
  const voucher = await prisma.voucher.create({
    data: {
      code,
      type: 'PERCENT',
      value: 10,
      minPurchase: 0,
      channel: 'ALL',
      isActive: true,
      createdByUserId: admin.id,
      ...overrides,
    },
  });
  return voucher;
}

function buildRequest(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/vouchers/validate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

describe('POST /api/vouchers/validate', () => {
  afterAll(async () => {
    await prisma.voucherRedemption.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.voucher.deleteMany({ where: { code: { in: createdVoucherCodes } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('rejects an invalid payload', async () => {
    const response = await POST(buildRequest({ code: '', subtotal: 10000, channel: 'ONLINE' }));
    expect(response.status).toBe(400);
  });

  it('returns NOT_FOUND for an unknown code', async () => {
    const response = await POST(
      buildRequest({ code: 'DOES-NOT-EXIST', subtotal: 10000, channel: 'ONLINE' }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ valid: false, reason: 'NOT_FOUND' });
  });

  it('normalizes the code to uppercase before lookup', async () => {
    const voucher = await createVoucher();

    const response = await POST(
      buildRequest({
        code: voucher.code.toLowerCase(),
        subtotal: 100000,
        channel: 'ONLINE',
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.valid).toBe(true);
    expect(json.code).toBe(voucher.code);
  });

  it('returns INACTIVE for a disabled voucher', async () => {
    const voucher = await createVoucher({ isActive: false });

    const response = await POST(
      buildRequest({ code: voucher.code, subtotal: 100000, channel: 'ONLINE' }),
    );
    const json = await response.json();

    expect(json).toEqual({ valid: false, reason: 'INACTIVE' });
  });

  it('returns NOT_STARTED before the voucher start date', async () => {
    const voucher = await createVoucher({ startsAt: new Date(Date.now() + 86_400_000) });

    const response = await POST(
      buildRequest({ code: voucher.code, subtotal: 100000, channel: 'ONLINE' }),
    );
    const json = await response.json();

    expect(json).toEqual({ valid: false, reason: 'NOT_STARTED' });
  });

  it('returns EXPIRED after the voucher expiry date', async () => {
    const voucher = await createVoucher({ expiresAt: new Date(Date.now() - 86_400_000) });

    const response = await POST(
      buildRequest({ code: voucher.code, subtotal: 100000, channel: 'ONLINE' }),
    );
    const json = await response.json();

    expect(json).toEqual({ valid: false, reason: 'EXPIRED' });
  });

  it('returns WRONG_CHANNEL when the channel does not match', async () => {
    const voucher = await createVoucher({ channel: 'POS' });

    const response = await POST(
      buildRequest({ code: voucher.code, subtotal: 100000, channel: 'ONLINE' }),
    );
    const json = await response.json();

    expect(json).toEqual({ valid: false, reason: 'WRONG_CHANNEL' });
  });

  it('returns MIN_PURCHASE_NOT_MET when subtotal is below the minimum', async () => {
    const voucher = await createVoucher({ minPurchase: 50000 });

    const response = await POST(
      buildRequest({ code: voucher.code, subtotal: 10000, channel: 'ONLINE' }),
    );
    const json = await response.json();

    expect(json).toEqual({ valid: false, reason: 'MIN_PURCHASE_NOT_MET' });
  });

  it('returns QUOTA_EXCEEDED when the quota is used up', async () => {
    const voucher = await createVoucher({ quota: 1, usedCount: 1 });

    const response = await POST(
      buildRequest({ code: voucher.code, subtotal: 100000, channel: 'ONLINE' }),
    );
    const json = await response.json();

    expect(json).toEqual({ valid: false, reason: 'QUOTA_EXCEEDED' });
  });

  it('returns USER_LIMIT_REACHED when the member already redeemed their limit', async () => {
    const voucher = await createVoucher({ perUserLimit: 1 });
    const { buyer, cookie } = await createBuyerCookie();

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-TEST-${randomUUID()}`,
        userId: buyer.id,
        receiverName: 'Budi',
        receiverPhone: '08123456789',
        receiverEmail: 'budi@example.com',
        receiverAddress: 'Addr',
        receiverCity: 'City',
        subtotal: 100000,
        shippingCost: 5000,
        discount: 10000,
        total: 95000,
        paymentMethod: 'BANK_TRANSFER',
        source: 'ONLINE',
      },
    });
    createdOrderIds.push(order.id);
    await prisma.voucherRedemption.create({
      data: { voucherId: voucher.id, orderId: order.id, userId: buyer.id, discountAmount: 10000 },
    });

    const response = await POST(
      buildRequest({ code: voucher.code, subtotal: 100000, channel: 'ONLINE' }, cookie),
    );
    const json = await response.json();

    expect(json).toEqual({ valid: false, reason: 'USER_LIMIT_REACHED' });
  });

  it('does not enforce perUserLimit for guest requests', async () => {
    const voucher = await createVoucher({ perUserLimit: 1 });

    const response = await POST(
      buildRequest({ code: voucher.code, subtotal: 100000, channel: 'ONLINE' }),
    );
    const json = await response.json();

    expect(json.valid).toBe(true);
  });

  it('computes a percent discount clamped to maxDiscount', async () => {
    const voucher = await createVoucher({ type: 'PERCENT', value: 20, maxDiscount: 15000 });

    const response = await POST(
      buildRequest({ code: voucher.code, subtotal: 100000, channel: 'ONLINE' }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      valid: true,
      voucherId: voucher.id,
      code: voucher.code,
      type: 'PERCENT',
      discountAmount: 15000,
    });
  });

  it('computes a fixed discount capped at the subtotal', async () => {
    const voucher = await createVoucher({ type: 'FIXED', value: 50000 });

    const response = await POST(
      buildRequest({ code: voucher.code, subtotal: 30000, channel: 'ONLINE' }),
    );
    const json = await response.json();

    expect(json.discountAmount).toBe(30000);
  });

  it('does not create a VoucherRedemption (read-only, idempotent)', async () => {
    const voucher = await createVoucher();

    await POST(buildRequest({ code: voucher.code, subtotal: 100000, channel: 'ONLINE' }));

    const redemptions = await prisma.voucherRedemption.count({
      where: { voucherId: voucher.id },
    });
    expect(redemptions).toBe(0);
  });
});
