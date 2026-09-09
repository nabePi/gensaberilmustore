import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, PUT } from '@/app/api/admin/config/homepage/sections/[id]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdSectionIds: string[] = [];

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

async function createProduct(overrides: Partial<{ discountPercent: number }> = {}) {
  const product = await prisma.product.create({
    data: {
      sku: `SKU-${randomUUID()}`,
      slug: `slug-${randomUUID()}`,
      title: `Homepage Product ${randomUUID()}`,
      subtitle: '',
      author: 'Author',
      description: 'Desc',
      price: 100000,
      finalPrice: 100000,
      discountPercent: overrides.discountPercent ?? 0,
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

async function createSection() {
  const section = await prisma.homepageSection.create({
    data: {
      key: `test-${randomUUID()}`,
      title: 'Section',
      subtitle: '',
      promoImageUrl: '',
      position: 0,
    },
  });
  createdSectionIds.push(section.id);
  return section;
}

function buildRequest(id: string, method: string, body: unknown, cookie: string) {
  return new NextRequest(`http://localhost/api/admin/config/homepage/sections/${id}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function callGet(id: string, cookie: string) {
  return GET(buildRequest(id, 'GET', undefined, cookie), { params: Promise.resolve({ id }) });
}

function callPut(id: string, body: unknown, cookie: string) {
  return PUT(buildRequest(id, 'PUT', body, cookie), { params: Promise.resolve({ id }) });
}

afterAll(async () => {
  await prisma.homepageSectionProduct.deleteMany({
    where: { sectionId: { in: createdSectionIds } },
  });
  await prisma.homepageSection.deleteMany({ where: { id: { in: createdSectionIds } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/config/homepage/sections/[id]', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await callGet(randomUUID(), '');
    expect(response.status).toBe(401);
  });

  it('returns 404 for an unknown section', async () => {
    const cookie = await createAdminCookie();
    const response = await callGet(randomUUID(), cookie);
    expect(response.status).toBe(404);
  });

  it('returns products with their current discount fields', async () => {
    const cookie = await createAdminCookie();
    const section = await createSection();
    const product = await createProduct({ discountPercent: 15 });
    await prisma.homepageSectionProduct.create({
      data: { sectionId: section.id, productId: product.id, position: 0 },
    });

    const response = await callGet(section.id, cookie);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.products).toHaveLength(1);
    expect(json.products[0].productId).toBe(product.id);
    expect(json.products[0].discountPercent).toBe(15);
  });
});

describe('PUT /api/admin/config/homepage/sections/[id]', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await callPut(randomUUID(), {}, '');
    expect(response.status).toBe(401);
  });

  it('returns 404 for an unknown section', async () => {
    const cookie = await createAdminCookie();
    const response = await callPut(
      randomUUID(),
      {
        title: 'T',
        subtitle: 'S',
        isEnabled: true,
        type: 'REGULAR',
        products: [],
      },
      cookie,
    );
    expect(response.status).toBe(404);
  });

  it('rejects an unknown productId', async () => {
    const cookie = await createAdminCookie();
    const section = await createSection();
    const response = await callPut(
      section.id,
      {
        title: 'T',
        subtitle: 'S',
        isEnabled: true,
        type: 'REGULAR',
        products: [{ productId: randomUUID() }],
      },
      cookie,
    );
    expect(response.status).toBe(400);
  });

  it('rejects a PROMO section missing discount fields per product', async () => {
    const cookie = await createAdminCookie();
    const section = await createSection();
    const product = await createProduct();
    const response = await callPut(
      section.id,
      {
        title: 'T',
        subtitle: 'S',
        isEnabled: true,
        type: 'PROMO',
        products: [{ productId: product.id }],
      },
      cookie,
    );
    expect(response.status).toBe(400);
  });

  it('accepts a REGULAR section with plain products and does not touch Product rows', async () => {
    const cookie = await createAdminCookie();
    const section = await createSection();
    const product = await createProduct({ discountPercent: 0 });

    const response = await callPut(
      section.id,
      {
        title: 'T',
        subtitle: 'S',
        isEnabled: true,
        type: 'REGULAR',
        products: [{ productId: product.id }],
      },
      cookie,
    );
    expect(response.status).toBe(200);

    const persistedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(persistedProduct?.discountPercent).toBe(0);
    expect(persistedProduct?.discountEndDate).toBeNull();
  });

  it('updates Product.discountPercent/discountEndDate for a PROMO section', async () => {
    const cookie = await createAdminCookie();
    const section = await createSection();
    const product = await createProduct();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    const endDateStr = endDate.toISOString().slice(0, 10);

    const response = await callPut(
      section.id,
      {
        title: 'T',
        subtitle: 'S',
        isEnabled: true,
        type: 'PROMO',
        products: [{ productId: product.id, discountPercent: 20, discountEndDate: endDateStr }],
      },
      cookie,
    );
    expect(response.status).toBe(200);

    const persistedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(persistedProduct?.discountPercent).toBe(20);
    expect(persistedProduct?.discountEndDate?.toISOString().slice(0, 10)).toBe(endDateStr);
  });
});
