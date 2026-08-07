import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/cart/route';
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

async function createGuestCartWithItem(
  product: { id: string; finalPrice: number },
  priceSnapshot: number,
  quantity = 1,
) {
  const guestToken = randomUUID();
  const cart = await prisma.cart.create({ data: { guestToken } });
  createdCartIds.push(cart.id);
  await prisma.cartItem.create({
    data: { cartId: cart.id, productId: product.id, quantity, priceSnapshot },
  });
  return guestToken;
}

function buildRequest(cookie?: string) {
  return new NextRequest('http://localhost/api/cart', {
    headers: cookie ? { cookie } : undefined,
  });
}

describe('GET /api/cart', () => {
  afterAll(async () => {
    await prisma.cartItem.deleteMany({ where: { cartId: { in: createdCartIds } } });
    await prisma.cart.deleteMany({ where: { id: { in: createdCartIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('creates a guest cart and sets a cookie when none exists', async () => {
    const response = await GET(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ items: [], subtotal: 0, itemCount: 0 });
    const cookie = response.cookies.get(GUEST_CART_COOKIE_NAME);
    expect(cookie?.value).toBeTruthy();

    const cart = await prisma.cart.findUnique({ where: { guestToken: cookie?.value } });
    if (cart) createdCartIds.push(cart.id);
  });

  it('returns an existing guest cart without setting a new cookie', async () => {
    const product = await createProduct();
    const guestToken = await createGuestCartWithItem(product, product.finalPrice, 2);

    const response = await GET(buildRequest(`${GUEST_CART_COOKIE_NAME}=${guestToken}`));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].quantity).toBe(2);
    expect(json.itemCount).toBe(2);
    expect(json.subtotal).toBe(product.finalPrice * 2);
    expect(response.cookies.get(GUEST_CART_COOKIE_NAME)).toBeUndefined();
  });

  it('flags an item as price_changed when the product price has since changed', async () => {
    const product = await createProduct({ finalPrice: 90000 });
    const guestToken = await createGuestCartWithItem(product, 100000, 1);

    const response = await GET(buildRequest(`${GUEST_CART_COOKIE_NAME}=${guestToken}`));
    const json = await response.json();

    expect(json.items[0].flag).toBe('price_changed');
  });

  it('flags an item as out_of_stock when stock is below the cart quantity', async () => {
    const product = await createProduct({ stock: 1 });
    const guestToken = await createGuestCartWithItem(product, product.finalPrice, 5);

    const response = await GET(buildRequest(`${GUEST_CART_COOKIE_NAME}=${guestToken}`));
    const json = await response.json();

    expect(json.items[0].flag).toBe('out_of_stock');
  });

  it('flags an item as out_of_stock when the product has been deactivated', async () => {
    const product = await createProduct({ isActive: false });
    const guestToken = await createGuestCartWithItem(product, product.finalPrice, 1);

    const response = await GET(buildRequest(`${GUEST_CART_COOKIE_NAME}=${guestToken}`));
    const json = await response.json();

    expect(json.items[0].flag).toBe('out_of_stock');
  });

  it('returns the cart belonging to an authenticated member', async () => {
    const cookie = await createMemberCookie();

    const response = await GET(buildRequest(cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ items: [], subtotal: 0, itemCount: 0 });
    expect(response.cookies.get(GUEST_CART_COOKIE_NAME)).toBeUndefined();
  });
});
