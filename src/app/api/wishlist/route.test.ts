import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, POST } from '@/app/api/wishlist/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession, SESSION_COOKIE_NAME } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdUserIds: string[] = [];
const createdProductIds: string[] = [];

async function createMemberCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const user = await prisma.user.create({
    data: { email, passwordHash, name: 'Member', role: 'BUYER' },
  });
  createdUserIds.push(user.id);
  const { token } = await createSession({ userId: user.id });
  return { cookie: `${SESSION_COOKIE_NAME}=${token}`, user };
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
      imprint: 'Test Publisher',
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
  return new NextRequest('http://localhost/api/wishlist', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

afterAll(async () => {
  await prisma.wishlistItem.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/wishlist', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''));
    expect(response.status).toBe(401);
  });

  it('lists wishlist items ordered by newest first', async () => {
    const { cookie, user } = await createMemberCookie();
    const first = await createProduct({ title: 'First' });
    const second = await createProduct({ title: 'Second' });

    await prisma.wishlistItem.create({ data: { userId: user.id, productId: first.id } });
    await prisma.wishlistItem.create({ data: { userId: user.id, productId: second.id } });

    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(2);
    expect(json.items[0].id).toBe(second.id);
    expect(json.items[1].id).toBe(first.id);
  });

  it('only returns wishlist items belonging to the authenticated user', async () => {
    const { cookie } = await createMemberCookie();
    const { user: otherUser } = await createMemberCookie();
    const product = await createProduct();

    await prisma.wishlistItem.create({ data: { userId: otherUser.id, productId: product.id } });

    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(0);
  });
});

describe('POST /api/wishlist', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await POST(buildRequest('POST', { productId: randomUUID() }, ''));
    expect(response.status).toBe(401);
  });

  it('rejects an invalid payload', async () => {
    const { cookie } = await createMemberCookie();
    const response = await POST(buildRequest('POST', { productId: 'not-a-uuid' }, cookie));
    expect(response.status).toBe(400);
  });

  it('rejects a non-existent product', async () => {
    const { cookie } = await createMemberCookie();
    const response = await POST(buildRequest('POST', { productId: randomUUID() }, cookie));
    expect(response.status).toBe(400);
  });

  it('adds a product to the wishlist', async () => {
    const { cookie, user } = await createMemberCookie();
    const product = await createProduct();

    const response = await POST(buildRequest('POST', { productId: product.id }, cookie));
    expect(response.status).toBe(201);

    const item = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: user.id, productId: product.id } },
    });
    expect(item).not.toBeNull();
  });

  it('is idempotent when the product is already wishlisted', async () => {
    const { cookie, user } = await createMemberCookie();
    const product = await createProduct();

    await prisma.wishlistItem.create({ data: { userId: user.id, productId: product.id } });

    const response = await POST(buildRequest('POST', { productId: product.id }, cookie));
    expect(response.status).toBe(201);

    const items = await prisma.wishlistItem.findMany({
      where: { userId: user.id, productId: product.id },
    });
    expect(items).toHaveLength(1);
  });
});
