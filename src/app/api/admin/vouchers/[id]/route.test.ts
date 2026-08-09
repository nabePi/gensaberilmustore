import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { DELETE, GET, PUT } from '@/app/api/admin/vouchers/[id]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdVoucherIds: string[] = [];

async function createAdminCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const admin = await prisma.user.create({
    data: { email, passwordHash, name: 'Admin', role: 'ADMIN' },
  });
  const { token } = await createSession({ userId: admin.id });
  return { cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}`, adminId: admin.id };
}

async function createVoucher(adminId: string, overrides: Record<string, unknown> = {}) {
  const voucher = await prisma.voucher.create({
    data: {
      code: `TEST${randomUUID().slice(0, 8)}`,
      type: 'PERCENT',
      value: 10,
      minPurchase: 0,
      channel: 'ALL',
      isActive: true,
      createdByUserId: adminId,
      ...overrides,
    },
  });
  createdVoucherIds.push(voucher.id);
  return voucher;
}

function buildRequest(method: string, body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/admin/vouchers/x', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterAll(async () => {
  await prisma.voucher.deleteMany({ where: { id: { in: createdVoucherIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/vouchers/[id]', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a non-existent voucher', async () => {
    const { cookie } = await createAdminCookie();
    const response = await GET(buildRequest('GET', undefined, cookie), context(randomUUID()));
    expect(response.status).toBe(404);
  });

  it('returns voucher detail with usage stats', async () => {
    const { cookie, adminId } = await createAdminCookie();
    const voucher = await createVoucher(adminId);

    const response = await GET(buildRequest('GET', undefined, cookie), context(voucher.id));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.id).toBe(voucher.id);
    expect(json.stats.redemptionCount).toBe(0);
    expect(json.stats.totalDiscount).toBe(0);
  });
});

describe('PUT /api/admin/vouchers/[id]', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await PUT(buildRequest('PUT', {}, ''), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('rejects maxDiscount when the resulting type is FIXED', async () => {
    const { cookie, adminId } = await createAdminCookie();
    const voucher = await createVoucher(adminId, { type: 'FIXED', value: 5000 });

    const response = await PUT(
      buildRequest('PUT', { maxDiscount: 10000 }, cookie),
      context(voucher.id),
    );
    expect(response.status).toBe(400);
  });

  it('updates a voucher', async () => {
    const { cookie, adminId } = await createAdminCookie();
    const voucher = await createVoucher(adminId);

    const response = await PUT(
      buildRequest('PUT', { isActive: false, value: 20 }, cookie),
      context(voucher.id),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.isActive).toBe(false);
    expect(json.value).toBe(20);
  });
});

describe('DELETE /api/admin/vouchers/[id]', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await DELETE(buildRequest('DELETE', undefined, ''), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('deletes an unused voucher', async () => {
    const { cookie, adminId } = await createAdminCookie();
    const voucher = await createVoucher(adminId);

    const response = await DELETE(buildRequest('DELETE', undefined, cookie), context(voucher.id));
    expect(response.status).toBe(204);
    createdVoucherIds.splice(createdVoucherIds.indexOf(voucher.id), 1);
  });

  it('rejects deleting a voucher that has already been used', async () => {
    const { cookie, adminId } = await createAdminCookie();
    const voucher = await createVoucher(adminId, { usedCount: 1 });

    const response = await DELETE(buildRequest('DELETE', undefined, cookie), context(voucher.id));
    expect(response.status).toBe(409);
  });
});
