import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { DELETE, PUT } from '@/app/api/admin/products/[id]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdCategoryIds: string[] = [];

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

async function createProduct(
  overrides: Partial<Parameters<typeof prisma.product.create>[0]['data']> = {},
) {
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
      ...overrides,
    },
  });
  createdProductIds.push(product.id);
  return product;
}

function buildRequest(method: string, body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/admin/products/x', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterAll(async () => {
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('PUT /api/admin/products/[id]', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await PUT(buildRequest('PUT', { title: 'New' }, ''), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a non-existent product', async () => {
    const cookie = await createAdminCookie();
    const response = await PUT(
      buildRequest('PUT', { title: 'New' }, cookie),
      context(randomUUID()),
    );
    expect(response.status).toBe(404);
  });

  it('partially updates a product without touching other fields', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct({ stock: 5 });

    const response = await PUT(buildRequest('PUT', { stock: 20 }, cookie), context(product.id));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.stock).toBe(20);
    expect(json.title).toBe(product.title);
  });

  it('keeps the slug stable by default', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();

    const response = await PUT(
      buildRequest('PUT', { title: 'Completely Different Title' }, cookie),
      context(product.id),
    );
    const json = await response.json();

    expect(json.slug).toBe(product.slug);
  });

  it('regenerates the slug when regenerateSlug is true', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();

    const response = await PUT(
      buildRequest(
        'PUT',
        { title: `Brand New Title ${randomUUID()}`, regenerateSlug: true },
        cookie,
      ),
      context(product.id),
    );
    const json = await response.json();

    expect(json.slug).not.toBe(product.slug);
  });

  it('recomputes finalPrice when price or discountPercent changes', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct({ price: 100000, discountPercent: 0, finalPrice: 100000 });

    const response = await PUT(
      buildRequest('PUT', { discountPercent: 20 }, cookie),
      context(product.id),
    );
    const json = await response.json();

    expect(json.finalPrice).toBe(80000);
  });

  it('does not recompute finalPrice when price/discount are untouched', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct({ price: 100000, discountPercent: 10, finalPrice: 90000 });

    const response = await PUT(buildRequest('PUT', { stock: 3 }, cookie), context(product.id));
    const json = await response.json();

    expect(json.finalPrice).toBe(90000);
  });

  it('replaces category associations transactionally', async () => {
    const cookie = await createAdminCookie();
    const categoryA = await prisma.category.create({
      data: { name: `A ${randomUUID()}`, slug: `a-${randomUUID()}` },
    });
    const categoryB = await prisma.category.create({
      data: { name: `B ${randomUUID()}`, slug: `b-${randomUUID()}` },
    });
    createdCategoryIds.push(categoryA.id, categoryB.id);
    const product = await createProduct({ categories: { create: { categoryId: categoryA.id } } });

    const response = await PUT(
      buildRequest('PUT', { categoryIds: [categoryB.id] }, cookie),
      context(product.id),
    );
    const json = await response.json();

    const categoryIds = json.categories.map((c: { id: string }) => c.id);
    expect(categoryIds).toContain(categoryB.id);
    expect(categoryIds).not.toContain(categoryA.id);
  });
});

describe('DELETE /api/admin/products/[id]', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await DELETE(buildRequest('DELETE', undefined, ''), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a non-existent product', async () => {
    const cookie = await createAdminCookie();
    const response = await DELETE(buildRequest('DELETE', undefined, cookie), context(randomUUID()));
    expect(response.status).toBe(404);
  });

  it('soft-deletes a product by setting isActive to false', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();

    const response = await DELETE(buildRequest('DELETE', undefined, cookie), context(product.id));
    expect(response.status).toBe(204);

    const updated = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updated?.isActive).toBe(false);
  });
});
