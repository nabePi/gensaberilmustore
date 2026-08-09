import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { PUT } from '@/app/api/admin/commission-rates/[productId]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];

async function createAdminCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const admin = await prisma.user.create({
    data: { email, passwordHash, name: 'Admin', role: 'ADMIN' },
  });
  const { token } = await createSession({ userId: admin.id });
  return `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
}

async function createProduct() {
  const product = await prisma.product.create({
    data: {
      sku: `SKU-${randomUUID()}`,
      slug: `slug-${randomUUID()}`,
      title: `Rate Product ${randomUUID()}`,
      subtitle: '',
      author: 'Author',
      description: 'Desc',
      price: 100000,
      finalPrice: 100000,
      stock: 5,
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

function buildRequest(body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/admin/commission-rates/x', {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function context(productId: string) {
  return { params: Promise.resolve({ productId }) };
}

afterAll(async () => {
  await prisma.affiliateCommissionRate.deleteMany({
    where: { productId: { in: createdProductIds } },
  });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('PUT /api/admin/commission-rates/[productId]', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await PUT(buildRequest({ percent: 10 }, ''), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a non-existent product', async () => {
    const cookie = await createAdminCookie();
    const response = await PUT(buildRequest({ percent: 10 }, cookie), context(randomUUID()));
    expect(response.status).toBe(404);
  });

  it('rejects percent outside 0-100', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();
    const response = await PUT(buildRequest({ percent: 150 }, cookie), context(product.id));
    expect(response.status).toBe(400);
  });

  it('creates a new commission rate', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();

    const response = await PUT(
      buildRequest({ percent: 12.5, isActive: true }, cookie),
      context(product.id),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.percent).toBe(12.5);
    expect(json.isActive).toBe(true);
  });

  it('updates an existing commission rate', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();
    await prisma.affiliateCommissionRate.create({
      data: { productId: product.id, percent: 10, isActive: true },
    });

    const response = await PUT(
      buildRequest({ percent: 20, isActive: false }, cookie),
      context(product.id),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.percent).toBe(20);
    expect(json.isActive).toBe(false);
  });
});
