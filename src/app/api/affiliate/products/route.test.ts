import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, POST, PUT } from '@/app/api/affiliate/products/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdAffiliateProfileIds: string[] = [];

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

function buildGetRequest(cookie?: string) {
  return new NextRequest('http://localhost/api/affiliate/products', {
    headers: cookie ? { cookie } : undefined,
  });
}

function buildWriteRequest(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/affiliate/products', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

describe('GET /api/affiliate/products', () => {
  afterAll(async () => {
    await prisma.affiliateProductSelection.deleteMany({
      where: { affiliateProfileId: { in: createdAffiliateProfileIds } },
    });
    await prisma.affiliateProfile.deleteMany({ where: { id: { in: createdAffiliateProfileIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without a session', async () => {
    const response = await GET(buildGetRequest());
    expect(response.status).toBe(401);
  });

  it('returns 404 when the user has no affiliate profile', async () => {
    const user = await createTestUser('BUYER');
    const cookie = await createSessionCookie(user.id);

    const response = await GET(buildGetRequest(cookie));
    expect(response.status).toBe(404);
  });

  it('marks products already selected by the affiliate as isSelected', async () => {
    const user = await createTestUser();
    const cookie = await createSessionCookie(user.id);
    const profile = await createAffiliateProfile(user.id);
    const product = await createProduct();

    await prisma.affiliateProductSelection.create({
      data: { affiliateProfileId: profile.id, productId: product.id },
    });

    const response = await GET(buildGetRequest(cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    const item = json.items.find((entry: { id: string }) => entry.id === product.id);
    expect(item?.isSelected).toBe(true);
  });
});

describe('PUT/POST /api/affiliate/products', () => {
  it('returns 404 when the user has no affiliate profile', async () => {
    const user = await createTestUser('BUYER');
    const cookie = await createSessionCookie(user.id);

    const response = await PUT(buildWriteRequest({ productIds: [] }, cookie));
    expect(response.status).toBe(404);
  });

  it('rejects an invalid payload', async () => {
    const user = await createTestUser();
    const cookie = await createSessionCookie(user.id);
    await createAffiliateProfile(user.id);

    const response = await PUT(buildWriteRequest({ productIds: ['not-a-uuid'] }, cookie));
    expect(response.status).toBe(400);
  });

  it('replaces the product selection with PUT', async () => {
    const user = await createTestUser();
    const cookie = await createSessionCookie(user.id);
    const profile = await createAffiliateProfile(user.id);
    const productA = await createProduct();
    const productB = await createProduct();

    await prisma.affiliateProductSelection.create({
      data: { affiliateProfileId: profile.id, productId: productA.id },
    });

    const response = await PUT(buildWriteRequest({ productIds: [productB.id] }, cookie));
    expect(response.status).toBe(200);

    const selections = await prisma.affiliateProductSelection.findMany({
      where: { affiliateProfileId: profile.id },
    });
    expect(selections).toHaveLength(1);
    expect(selections[0]?.productId).toBe(productB.id);
  });

  it('accepts POST as an alias for PUT', async () => {
    const user = await createTestUser();
    const cookie = await createSessionCookie(user.id);
    const profile = await createAffiliateProfile(user.id);
    const product = await createProduct();

    const response = await POST(buildWriteRequest({ productIds: [product.id] }, cookie));
    expect(response.status).toBe(200);

    const selections = await prisma.affiliateProductSelection.findMany({
      where: { affiliateProfileId: profile.id },
    });
    expect(selections).toHaveLength(1);
  });
});
