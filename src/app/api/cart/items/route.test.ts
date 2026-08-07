import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/cart/items/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession, SESSION_COOKIE_NAME } from '@/server/auth/session';
import { GUEST_CART_COOKIE_NAME } from '@/server/cart/cart';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdCartIds: string[] = [];

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

async function createMemberCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const user = await prisma.user.create({
    data: { email, passwordHash, name: 'Test User', role: 'BUYER' },
  });
  const { token } = await createSession({ userId: user.id });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

async function createGuestCart() {
  const guestToken = randomUUID();
  const cart = await prisma.cart.create({ data: { guestToken } });
  createdCartIds.push(cart.id);
  return guestToken;
}

function buildRequest(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/cart/items', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

async function post(body: unknown, cookie?: string) {
  const response = await POST(buildRequest(body, cookie));
  const setCookie = response.cookies.get(GUEST_CART_COOKIE_NAME);
  if (setCookie?.value) {
    const cart = await prisma.cart.findUnique({ where: { guestToken: setCookie.value } });
    if (cart) createdCartIds.push(cart.id);
  }
  return response;
}

describe('POST /api/cart/items', () => {
  afterAll(async () => {
    await prisma.cartItem.deleteMany({ where: { cartId: { in: createdCartIds } } });
    await prisma.cart.deleteMany({ where: { id: { in: createdCartIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('rejects invalid payloads', async () => {
    const response = await post({ productId: 'not-a-uuid', quantity: 0 });
    expect(response.status).toBe(400);
  });

  it('returns 404 for a non-existent product', async () => {
    const response = await post({ productId: randomUUID(), quantity: 1 });
    expect(response.status).toBe(404);
  });

  it('returns 404 for an inactive product', async () => {
    const product = await createProduct({ isActive: false });
    const response = await post({ productId: product.id, quantity: 1 });
    expect(response.status).toBe(404);
  });

  it('adds a new item to a guest cart and sets the guest cookie', async () => {
    const product = await createProduct();

    const response = await post({ productId: product.id, quantity: 2 });
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].quantity).toBe(2);
    expect(response.cookies.get(GUEST_CART_COOKIE_NAME)?.value).toBeTruthy();
  });

  it('increments the quantity when the product is already in the cart', async () => {
    const product = await createProduct({ stock: 10 });
    const guestToken = await createGuestCart();
    const cookie = `${GUEST_CART_COOKIE_NAME}=${guestToken}`;

    await post({ productId: product.id, quantity: 2 }, cookie);
    const response = await post({ productId: product.id, quantity: 3 }, cookie);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].quantity).toBe(5);
  });

  it('rejects adding more than available stock', async () => {
    const product = await createProduct({ stock: 2 });

    const response = await post({ productId: product.id, quantity: 3 });
    expect(response.status).toBe(400);
  });

  it('prevents overselling across repeated add-to-cart calls', async () => {
    const product = await createProduct({ stock: 3 });
    const guestToken = await createGuestCart();
    const cookie = `${GUEST_CART_COOKIE_NAME}=${guestToken}`;

    const first = await post({ productId: product.id, quantity: 2 }, cookie);
    expect(first.status).toBe(201);

    const second = await post({ productId: product.id, quantity: 2 }, cookie);
    expect(second.status).toBe(400);
  });

  it('adds items to an authenticated member cart', async () => {
    const product = await createProduct();
    const cookie = await createMemberCookie();

    const response = await POST(buildRequest({ productId: product.id, quantity: 1 }, cookie));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.items[0].productId).toBe(product.id);
    expect(response.cookies.get(GUEST_CART_COOKIE_NAME)).toBeUndefined();
  });
});
