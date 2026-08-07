import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { DELETE, PUT } from '@/app/api/admin/categories/[id]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdCategoryIds: string[] = [];
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

async function createCategory(name: string) {
  const slug = `${randomUUID()}`;
  const category = await prisma.category.create({ data: { name, slug } });
  createdCategoryIds.push(category.id);
  return category;
}

function buildRequest(url: string, method: string, body: unknown, cookie: string) {
  return new NextRequest(url, {
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

describe('PUT /api/admin/categories/[id]', () => {
  it('returns 404 for a non-existent category', async () => {
    const cookie = await createAdminCookie();
    const response = await PUT(
      buildRequest('http://localhost/api/admin/categories/x', 'PUT', { name: 'New name' }, cookie),
      context(randomUUID()),
    );
    expect(response.status).toBe(404);
  });

  it('updates the name without changing the slug', async () => {
    const cookie = await createAdminCookie();
    const category = await createCategory(`Original ${randomUUID()}`);
    const originalSlug = category.slug;

    const response = await PUT(
      buildRequest(
        'http://localhost/api/admin/categories/x',
        'PUT',
        { name: 'Updated Name' },
        cookie,
      ),
      context(category.id),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.name).toBe('Updated Name');
    expect(json.slug).toBe(originalSlug);
  });
});

describe('DELETE /api/admin/categories/[id]', () => {
  it('returns 409 when products are still linked', async () => {
    const cookie = await createAdminCookie();
    const category = await createCategory(`Linked ${randomUUID()}`);
    const product = await prisma.product.create({
      data: {
        sku: `SKU-${randomUUID()}`,
        slug: `slug-${randomUUID()}`,
        title: 'Test Product',
        subtitle: '',
        author: 'Author',
        description: 'Desc',
        price: 10000,
        finalPrice: 10000,
        weightGram: 100,
        pageCount: 100,
        coverType: 'SOFTCOVER',
        publishYear: 2024,
        categories: { create: { categoryId: category.id } },
      },
    });
    createdProductIds.push(product.id);

    const response = await DELETE(
      buildRequest('http://localhost/api/admin/categories/x', 'DELETE', undefined, cookie),
      context(category.id),
    );

    expect(response.status).toBe(409);
  });

  it('deletes a category with no linked products', async () => {
    const cookie = await createAdminCookie();
    const category = await createCategory(`Deletable ${randomUUID()}`);

    const response = await DELETE(
      buildRequest('http://localhost/api/admin/categories/x', 'DELETE', undefined, cookie),
      context(category.id),
    );

    expect(response.status).toBe(204);
    createdCategoryIds.splice(createdCategoryIds.indexOf(category.id), 1);
  });
});
