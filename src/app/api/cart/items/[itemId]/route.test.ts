import { randomUUID } from 'node:crypto';

import { NextRequest, type NextResponse } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { DELETE, PATCH } from '@/app/api/cart/items/[itemId]/route';
import { prisma } from '@/lib/db';
import { GUEST_CART_COOKIE_NAME } from '@/server/cart/cart';

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

async function createGuestCartWithItem(productId: string, priceSnapshot: number, quantity = 1) {
  const guestToken = randomUUID();
  const cart = await prisma.cart.create({ data: { guestToken } });
  createdCartIds.push(cart.id);
  const item = await prisma.cartItem.create({
    data: { cartId: cart.id, productId, quantity, priceSnapshot },
  });
  return { guestToken, item };
}

function buildRequest(method: string, body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/cart/items/x', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

function context(itemId: string) {
  return { params: Promise.resolve({ itemId }) };
}

async function trackGuestCookie(response: NextResponse) {
  const setCookie = response.cookies.get(GUEST_CART_COOKIE_NAME);
  if (setCookie?.value) {
    const cart = await prisma.cart.findUnique({ where: { guestToken: setCookie.value } });
    if (cart) createdCartIds.push(cart.id);
  }
  return response;
}

async function patch(itemId: string, body: unknown, cookie?: string) {
  const response = await PATCH(buildRequest('PATCH', body, cookie), context(itemId));
  return trackGuestCookie(response);
}

async function del(itemId: string, cookie?: string) {
  const response = await DELETE(buildRequest('DELETE', undefined, cookie), context(itemId));
  return trackGuestCookie(response);
}

describe('PATCH /api/cart/items/[itemId]', () => {
  afterAll(async () => {
    await prisma.cartItem.deleteMany({ where: { cartId: { in: createdCartIds } } });
    await prisma.cart.deleteMany({ where: { id: { in: createdCartIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  });

  it('rejects an invalid quantity', async () => {
    const response = await patch(randomUUID(), { quantity: 0 });
    expect(response.status).toBe(400);
  });

  it('returns 404 when the item does not exist', async () => {
    const response = await patch(randomUUID(), { quantity: 2 });
    expect(response.status).toBe(404);
  });

  it('returns 404 when the item belongs to a different cart', async () => {
    const product = await createProduct();
    const { item } = await createGuestCartWithItem(product.id, product.finalPrice, 1);

    const otherGuestToken = randomUUID();
    const otherCart = await prisma.cart.create({ data: { guestToken: otherGuestToken } });
    createdCartIds.push(otherCart.id);

    const response = await patch(
      item.id,
      { quantity: 2 },
      `${GUEST_CART_COOKIE_NAME}=${otherGuestToken}`,
    );

    expect(response.status).toBe(404);
  });

  it('updates the quantity and recomputes lineTotal', async () => {
    const product = await createProduct({ stock: 10 });
    const { guestToken, item } = await createGuestCartWithItem(product.id, product.finalPrice, 1);

    const response = await patch(
      item.id,
      { quantity: 4 },
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    const updatedItem = json.items.find((i: { id: string }) => i.id === item.id);
    expect(updatedItem.quantity).toBe(4);
    expect(updatedItem.lineTotal).toBe(product.finalPrice * 4);
  });

  it('rejects a quantity greater than available stock', async () => {
    const product = await createProduct({ stock: 2 });
    const { guestToken, item } = await createGuestCartWithItem(product.id, product.finalPrice, 1);

    const response = await patch(
      item.id,
      { quantity: 5 },
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/cart/items/[itemId]', () => {
  afterAll(async () => {
    await prisma.cartItem.deleteMany({ where: { cartId: { in: createdCartIds } } });
    await prisma.cart.deleteMany({ where: { id: { in: createdCartIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  });

  it('returns 404 when the item does not exist', async () => {
    const response = await del(randomUUID());
    expect(response.status).toBe(404);
  });

  it('returns 404 when the item belongs to a different cart', async () => {
    const product = await createProduct();
    const { item } = await createGuestCartWithItem(product.id, product.finalPrice, 1);

    const otherGuestToken = randomUUID();
    const otherCart = await prisma.cart.create({ data: { guestToken: otherGuestToken } });
    createdCartIds.push(otherCart.id);

    const response = await del(item.id, `${GUEST_CART_COOKIE_NAME}=${otherGuestToken}`);

    expect(response.status).toBe(404);
  });

  it('removes the item and returns the updated cart', async () => {
    const product = await createProduct();
    const { guestToken, item } = await createGuestCartWithItem(product.id, product.finalPrice, 2);

    const response = await del(item.id, `${GUEST_CART_COOKIE_NAME}=${guestToken}`);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items.find((i: { id: string }) => i.id === item.id)).toBeUndefined();

    const remaining = await prisma.cartItem.findUnique({ where: { id: item.id } });
    expect(remaining).toBeNull();
  });

  it('leaves an empty cart when the last item is removed', async () => {
    const product = await createProduct();
    const { guestToken, item } = await createGuestCartWithItem(product.id, product.finalPrice, 1);

    const response = await del(item.id, `${GUEST_CART_COOKIE_NAME}=${guestToken}`);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(0);
    expect(json.itemCount).toBe(0);
  });
});
