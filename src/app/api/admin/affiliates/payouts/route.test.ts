import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, POST } from '@/app/api/admin/affiliates/payouts/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdOrderIds: string[] = [];
const createdAffiliateProfileIds: string[] = [];
const createdPayoutIds: string[] = [];

async function createTestUser(role: 'BUYER' | 'ADMIN' | 'AFFILIATE' = 'BUYER') {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({ data: { email, passwordHash, name: 'Test User', role } });
}

async function createAdminCookie() {
  const admin = await createTestUser('ADMIN');
  const { token } = await createSession({ userId: admin.id });
  return `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
}

async function createAffiliateProfile() {
  const user = await createTestUser('AFFILIATE');
  const profile = await prisma.affiliateProfile.create({
    data: {
      userId: user.id,
      code: `AFF-${randomUUID()}`,
      payoutBankName: 'Bank',
      payoutBankAccount: '123',
      payoutBankHolder: 'Holder',
    },
  });
  createdAffiliateProfileIds.push(profile.id);
  return profile;
}

async function createOrder() {
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-${randomUUID()}`,
      receiverName: 'Budi Santoso',
      receiverPhone: '08123456789',
      receiverEmail: 'budi@example.com',
      receiverAddress: 'Addr',
      receiverCity: 'City',
      subtotal: 10000,
      shippingCost: 5000,
      discount: 0,
      total: 15000,
      paymentMethod: 'BANK_TRANSFER',
      source: 'ONLINE',
      status: 'COMPLETED',
    },
  });
  createdOrderIds.push(order.id);
  return order;
}

async function createConversion(
  affiliateProfileId: string,
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED',
  commissionAmount = 10000,
) {
  const order = await createOrder();
  return prisma.affiliateConversion.create({
    data: { affiliateProfileId, orderId: order.id, commissionAmount, status },
  });
}

function buildGetRequest(query: string, cookie?: string) {
  return new NextRequest(`http://localhost/api/admin/affiliates/payouts${query}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

function buildPostRequest(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/admin/affiliates/payouts', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

describe('GET/POST /api/admin/affiliates/payouts', () => {
  afterAll(async () => {
    await prisma.affiliatePayout.deleteMany({ where: { id: { in: createdPayoutIds } } });
    await prisma.affiliateConversion.deleteMany({
      where: { affiliateProfileId: { in: createdAffiliateProfileIds } },
    });
    await prisma.affiliateProfile.deleteMany({ where: { id: { in: createdAffiliateProfileIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without an admin session', async () => {
    const response = await GET(buildGetRequest(''));
    expect(response.status).toBe(401);
  });

  it('rejects an invalid create payload', async () => {
    const cookie = await createAdminCookie();
    const response = await POST(buildPostRequest({}, cookie));
    expect(response.status).toBe(400);
  });

  it('returns 404 when the affiliate does not exist', async () => {
    const cookie = await createAdminCookie();
    const response = await POST(
      buildPostRequest(
        {
          affiliateProfileId: randomUUID(),
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
        },
        cookie,
      ),
    );
    expect(response.status).toBe(404);
  });

  it('rejects creating a batch when there are no approved conversions in the period', async () => {
    const cookie = await createAdminCookie();
    const profile = await createAffiliateProfile();

    const response = await POST(
      buildPostRequest(
        {
          affiliateProfileId: profile.id,
          periodStart: '2020-01-01',
          periodEnd: '2020-01-31',
        },
        cookie,
      ),
    );
    expect(response.status).toBe(400);
  });

  it('creates a payout batch from approved conversions and marks them paid', async () => {
    const cookie = await createAdminCookie();
    const profile = await createAffiliateProfile();
    const conversionA = await createConversion(profile.id, 'APPROVED', 10000);
    const conversionB = await createConversion(profile.id, 'APPROVED', 5000);
    await createConversion(profile.id, 'PENDING', 9999);

    const periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const response = await POST(
      buildPostRequest({ affiliateProfileId: profile.id, periodStart, periodEnd }, cookie),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.totalAmount).toBe(15000);
    expect(json.status).toBe('PENDING');
    createdPayoutIds.push(json.id);

    const updatedA = await prisma.affiliateConversion.findUnique({ where: { id: conversionA.id } });
    const updatedB = await prisma.affiliateConversion.findUnique({ where: { id: conversionB.id } });
    expect(updatedA?.status).toBe('PAID');
    expect(updatedB?.status).toBe('PAID');
  });

  it('lists payouts with affiliate summary', async () => {
    const cookie = await createAdminCookie();
    const profile = await createAffiliateProfile();
    await createConversion(profile.id, 'APPROVED', 20000);

    const periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const createResponse = await POST(
      buildPostRequest({ affiliateProfileId: profile.id, periodStart, periodEnd }, cookie),
    );
    const created = await createResponse.json();
    createdPayoutIds.push(created.id);

    const response = await GET(buildGetRequest(`?affiliateProfileId=${profile.id}`, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items.some((item: { id: string }) => item.id === created.id)).toBe(true);
    expect(json.items[0].affiliate.code).toBe(profile.code);
  });
});
