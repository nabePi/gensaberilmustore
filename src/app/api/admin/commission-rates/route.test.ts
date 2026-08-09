import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/commission-rates/route';
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
  return { cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}`, adminId: admin.id };
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

function buildRequest(cookie: string) {
  return new NextRequest('http://localhost/api/admin/commission-rates', {
    method: 'GET',
    headers: { cookie },
  });
}

afterAll(async () => {
  await prisma.affiliateCommissionRate.deleteMany({
    where: { productId: { in: createdProductIds } },
  });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/commission-rates', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest(''));
    expect(response.status).toBe(401);
  });

  it('lists commission rates with product info', async () => {
    const { cookie, adminId } = await createAdminCookie();
    const product = await createProduct();
    await prisma.affiliateCommissionRate.create({
      data: { productId: product.id, percent: 15, isActive: true, updatedByUserId: adminId },
    });

    const response = await GET(buildRequest(cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    const found = json.items.find((item: { productId: string }) => item.productId === product.id);
    expect(found).toBeTruthy();
    expect(found.percent).toBe(15);
  });
});
