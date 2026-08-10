import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/affiliate/stats/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdAffiliateProfileIds: string[] = [];
const createdOrderIds: string[] = [];

async function createTestUser(role: 'BUYER' | 'AFFILIATE' = 'AFFILIATE') {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({ data: { email, passwordHash, name: 'Test User', role } });
}

async function createSessionCookie(userId: string) {
  const { token } = await createSession({ userId });
  return `session=${token}`;
}

async function createAffiliateProfile(userId: string) {
  const profile = await prisma.affiliateProfile.create({
    data: {
      userId,
      code: `AFF-${randomUUID()}`,
      payoutBankName: 'Bank',
      payoutBankAccount: '123',
      payoutBankHolder: 'Holder',
    },
  });
  createdAffiliateProfileIds.push(profile.id);
  return profile;
}

async function createProduct() {
  const product = await prisma.product.create({
    data: {
      sku: `SKU-${randomUUID()}`,
      slug: `slug-${randomUUID()}`,
      title: `Test Product ${randomUUID()}`,
      subtitle: '',
      author: 'Test Author',
      description: 'Desc',
      price: 100000,
      finalPrice: 100000,
      stock: 10,
      weightGram: 100,
      pageCount: 100,
      coverType: 'SOFTCOVER',
      publishYear: 2024,
      isActive: true,
    },
  });
  createdProductIds.push(product.id);
  return product;
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
      status: 'PAID',
    },
  });
  createdOrderIds.push(order.id);
  return order;
}

function buildRequest(cookie?: string) {
  return new NextRequest('http://localhost/api/affiliate/stats', {
    headers: cookie ? { cookie } : undefined,
  });
}

describe('GET /api/affiliate/stats', () => {
  afterAll(async () => {
    await prisma.affiliateConversion.deleteMany({
      where: { affiliateProfileId: { in: createdAffiliateProfileIds } },
    });
    await prisma.affiliateClick.deleteMany({
      where: { affiliateProfileId: { in: createdAffiliateProfileIds } },
    });
    await prisma.affiliateProductSelection.deleteMany({
      where: { affiliateProfileId: { in: createdAffiliateProfileIds } },
    });
    await prisma.affiliateProfile.deleteMany({ where: { id: { in: createdAffiliateProfileIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without a session', async () => {
    const response = await GET(buildRequest());
    expect(response.status).toBe(401);
  });

  it('returns 404 when the user has no affiliate profile', async () => {
    const user = await createTestUser('BUYER');
    const cookie = await createSessionCookie(user.id);

    const response = await GET(buildRequest(cookie));
    expect(response.status).toBe(404);
  });

  it('aggregates clicks, conversions, and commission totals', async () => {
    const user = await createTestUser();
    const cookie = await createSessionCookie(user.id);
    const profile = await createAffiliateProfile(user.id);
    const product = await createProduct();

    await prisma.affiliateProductSelection.create({
      data: { affiliateProfileId: profile.id, productId: product.id },
    });
    await prisma.affiliateClick.create({
      data: {
        affiliateProfileId: profile.id,
        productId: product.id,
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
        cookieId: randomUUID(),
      },
    });
    const order = await createOrder();
    await prisma.affiliateConversion.create({
      data: {
        affiliateProfileId: profile.id,
        orderId: order.id,
        commissionAmount: 10000,
        status: 'PENDING',
      },
    });

    const response = await GET(buildRequest(cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.profile.code).toBe(profile.code);
    expect(json.totalClicks).toBeGreaterThanOrEqual(1);
    expect(json.totalConversions).toBeGreaterThanOrEqual(1);
    expect(json.commissionPending).toBeGreaterThanOrEqual(10000);
    expect(
      json.productPerformance.some((p: { productId: string }) => p.productId === product.id),
    ).toBe(true);
  });
});
