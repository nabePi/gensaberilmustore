import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/cart/merge/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';
import { GUEST_CART_COOKIE_NAME } from '@/server/cart/cart';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdCartIds: string[] = [];

async function createTestUser() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({
    data: { email, passwordHash, name: 'Test User', role: 'BUYER' },
  });
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

async function createGuestCartWithItem(productId: string, priceSnapshot: number, quantity = 1) {
  const guestToken = randomUUID();
  const cart = await prisma.cart.create({ data: { guestToken } });
  createdCartIds.push(cart.id);
  await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity, priceSnapshot } });
  return guestToken;
}

function buildRequest(sessionToken: string, guestToken?: string) {
  const cookies = [
    `session=${sessionToken}`,
    ...(guestToken ? [`${GUEST_CART_COOKIE_NAME}=${guestToken}`] : []),
  ];
  return new NextRequest('http://localhost/api/cart/merge', {
    method: 'POST',
    headers: { cookie: cookies.join('; ') },
  });
}

describe('POST /api/cart/merge', () => {
  afterAll(async () => {
    await prisma.cartItem.deleteMany({ where: { cartId: { in: createdCartIds } } });
    await prisma.cart.deleteMany({ where: { id: { in: createdCartIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 when there is no session', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/cart/merge', { method: 'POST' }),
    );
    expect(response.status).toBe(401);
  });

  it('returns the member cart untouched when there is no guest cart cookie', async () => {
    const user = await createTestUser();
    const { token } = await createSession({ userId: user.id });

    const response = await POST(buildRequest(token));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(0);

    const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (cart) createdCartIds.push(cart.id);
  });

  it('claims the guest cart when the member has no existing cart', async () => {
    const user = await createTestUser();
    const { token } = await createSession({ userId: user.id });
    const product = await createProduct();
    const guestToken = await createGuestCartWithItem(product.id, product.finalPrice, 2);

    const response = await POST(buildRequest(token, guestToken));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].quantity).toBe(2);

    const memberCart = await prisma.cart.findUnique({ where: { userId: user.id } });
    expect(memberCart).not.toBeNull();
    if (memberCart) createdCartIds.push(memberCart.id);

    const guestCart = await prisma.cart.findUnique({ where: { guestToken } });
    expect(guestCart).toBeNull();
  });

  it('merges quantities for overlapping products and caps to available stock', async () => {
    const user = await createTestUser();
    const { token } = await createSession({ userId: user.id });
    const product = await createProduct({ stock: 5 });

    const memberCart = await prisma.cart.create({ data: { userId: user.id } });
    createdCartIds.push(memberCart.id);
    await prisma.cartItem.create({
      data: {
        cartId: memberCart.id,
        productId: product.id,
        quantity: 3,
        priceSnapshot: product.finalPrice,
      },
    });

    const guestToken = await createGuestCartWithItem(product.id, product.finalPrice, 4);

    const response = await POST(buildRequest(token, guestToken));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].quantity).toBe(5);
  });

  it('clears the guest cookie in the response', async () => {
    const user = await createTestUser();
    const { token } = await createSession({ userId: user.id });
    const product = await createProduct();
    const guestToken = await createGuestCartWithItem(product.id, product.finalPrice, 1);

    const response = await POST(buildRequest(token, guestToken));

    const setCookieHeader = response.headers.get('set-cookie');
    expect(setCookieHeader).toContain(`${GUEST_CART_COOKIE_NAME}=;`);

    const memberCart = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (memberCart) createdCartIds.push(memberCart.id);
  });
});
