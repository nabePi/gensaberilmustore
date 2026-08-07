import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/admin/products/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdCategoryIds: string[] = [];
const createdTagIds: string[] = [];

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

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    sku: `SKU-${randomUUID()}`,
    title: `Test Product ${randomUUID()}`,
    author: 'Test Author',
    description: 'Desc',
    price: 100000,
    stock: 10,
    weightGram: 100,
    pageCount: 100,
    coverType: 'SOFTCOVER',
    publishYear: 2024,
    ...overrides,
  };
}

function buildRequest(body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

describe('POST /api/admin/products', () => {
  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
    await prisma.tag.deleteMany({ where: { id: { in: createdTagIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('rejects unauthenticated requests', async () => {
    const response = await POST(buildRequest(validPayload(), ''));
    expect(response.status).toBe(401);
  });

  it('creates a product with a generated slug and computed final price', async () => {
    const cookie = await createAdminCookie();
    const response = await POST(
      buildRequest(validPayload({ price: 100000, discountPercent: 10 }), cookie),
    );
    const json = await response.json();
    if (response.status === 201) createdProductIds.push(json.id);

    expect(response.status).toBe(201);
    expect(json.slug).toBeTruthy();
    expect(json.finalPrice).toBe(90000);
  });

  it('rejects invalid payloads with validation issues', async () => {
    const cookie = await createAdminCookie();
    const response = await POST(buildRequest(validPayload({ price: -5 }), cookie));

    expect(response.status).toBe(400);
  });

  it('rejects duplicate SKU with 409', async () => {
    const cookie = await createAdminCookie();
    const sku = `SKU-${randomUUID()}`;

    const first = await POST(buildRequest(validPayload({ sku }), cookie));
    const firstJson = await first.json();
    createdProductIds.push(firstJson.id);

    const second = await POST(buildRequest(validPayload({ sku }), cookie));
    expect(second.status).toBe(409);
  });

  it('rejects unknown categoryIds with 400', async () => {
    const cookie = await createAdminCookie();
    const response = await POST(
      buildRequest(validPayload({ categoryIds: [randomUUID()] }), cookie),
    );

    expect(response.status).toBe(400);
  });

  it('rejects unknown tagIds with 400', async () => {
    const cookie = await createAdminCookie();
    const response = await POST(buildRequest(validPayload({ tagIds: [randomUUID()] }), cookie));

    expect(response.status).toBe(400);
  });

  it('associates valid categoryIds and tagIds', async () => {
    const cookie = await createAdminCookie();
    const category = await prisma.category.create({
      data: { name: `Cat ${randomUUID()}`, slug: `cat-${randomUUID()}` },
    });
    createdCategoryIds.push(category.id);
    const tag = await prisma.tag.create({
      data: { name: `Tag ${randomUUID()}`, slug: `tag-${randomUUID()}` },
    });
    createdTagIds.push(tag.id);

    const response = await POST(
      buildRequest(validPayload({ categoryIds: [category.id], tagIds: [tag.id] }), cookie),
    );
    const json = await response.json();
    if (response.status === 201) createdProductIds.push(json.id);

    expect(response.status).toBe(201);
    expect(json.categories.map((c: { id: string }) => c.id)).toContain(category.id);
    expect(json.tags.map((t: { id: string }) => t.id)).toContain(tag.id);
  });
});
