import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, POST } from '@/app/api/orders/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';
import { GUEST_CART_COOKIE_NAME } from '@/server/cart/cart';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdCartIds: string[] = [];
const createdCityIds: string[] = [];
const createdOrderIds: string[] = [];
const createdVoucherCodes: string[] = [];
const createdReceiverIds: string[] = [];

async function createTestUser(role: 'BUYER' | 'ADMIN' = 'BUYER') {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({ data: { email, passwordHash, name: 'Test User', role } });
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
      discountPercent: 0,
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

async function createCity(
  overrides: Partial<Parameters<typeof prisma.city.create>[0]['data']> = {},
) {
  const city = await prisma.city.create({
    data: {
      name: `City ${randomUUID()}`,
      province: 'Test Province',
      shippingCost: 15000,
      isActive: true,
      ...overrides,
    },
  });
  createdCityIds.push(city.id);
  return city;
}

async function createGuestCartWithItem(productId: string, quantity = 1) {
  const guestToken = randomUUID();
  const cart = await prisma.cart.create({ data: { guestToken } });
  createdCartIds.push(cart.id);
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  await prisma.cartItem.create({
    data: { cartId: cart.id, productId, quantity, priceSnapshot: product.finalPrice },
  });
  return guestToken;
}

async function createMemberCartWithItem(userId: string, productId: string, quantity = 1) {
  const cart = await prisma.cart.create({ data: { userId } });
  createdCartIds.push(cart.id);
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  await prisma.cartItem.create({
    data: { cartId: cart.id, productId, quantity, priceSnapshot: product.finalPrice },
  });
}

function buildOrderRequest(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/orders', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

function receiverPayload(cityId: string, overrides: Record<string, unknown> = {}) {
  return {
    receiverName: 'Budi',
    receiverPhone: '08123456789',
    receiverEmail: 'budi@example.com',
    receiverAddress: 'Jl. Test No. 1',
    cityId,
    paymentMethod: 'BANK_TRANSFER',
    ...overrides,
  };
}

async function post(body: unknown, cookie?: string) {
  const response = await POST(buildOrderRequest(body, cookie));
  const json = await response.json().catch(() => null);
  if (json?.orderId) createdOrderIds.push(json.orderId);
  return { response, json };
}

describe('POST /api/orders', () => {
  afterAll(async () => {
    await prisma.voucherRedemption.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.voucher.deleteMany({ where: { code: { in: createdVoucherCodes } } });
    await prisma.receiver.deleteMany({ where: { id: { in: createdReceiverIds } } });
    await prisma.cartItem.deleteMany({ where: { cartId: { in: createdCartIds } } });
    await prisma.cart.deleteMany({ where: { id: { in: createdCartIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.city.deleteMany({ where: { id: { in: createdCityIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('rejects an invalid payload', async () => {
    const { response } = await post({});
    expect(response.status).toBe(400);
  });

  it('rejects when the cart is empty', async () => {
    const city = await createCity();
    const { response } = await post(receiverPayload(city.id));
    expect(response.status).toBe(400);
  });

  it('creates a guest order, decrements stock, and clears the cart', async () => {
    const city = await createCity();
    const product = await createProduct({ stock: 5, finalPrice: 50000 });
    const guestToken = await createGuestCartWithItem(product.id, 2);

    const { response, json } = await post(
      receiverPayload(city.id),
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );

    expect(response.status).toBe(201);
    expect(json.orderNumber).toMatch(/^ORD-/);

    const order = await prisma.order.findUnique({ where: { id: json.orderId } });
    expect(order?.subtotal).toBe(100000);
    expect(order?.shippingCost).toBe(city.shippingCost);
    expect(order?.total).toBe(100000 + city.shippingCost);
    expect(order?.status).toBe('AWAITING_PAYMENT');

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct?.stock).toBe(3);

    const cart = await prisma.cart.findUnique({ where: { guestToken } });
    expect(cart).toBeNull();

    const setCookieHeader = response.headers.get('set-cookie');
    expect(setCookieHeader).toContain(`${GUEST_CART_COOKIE_NAME}=;`);
  });

  it('rejects when stock is insufficient', async () => {
    const city = await createCity();
    const product = await createProduct({ stock: 1 });
    const guestToken = await createGuestCartWithItem(product.id, 5);

    const { response } = await post(
      receiverPayload(city.id),
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );

    expect(response.status).toBe(400);

    const unchangedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(unchangedProduct?.stock).toBe(1);
  });

  it('creates a member order using a saved receiver', async () => {
    const user = await createTestUser();
    const { token } = await createSession({ userId: user.id });
    const city = await createCity();
    const receiver = await prisma.receiver.create({
      data: {
        userId: user.id,
        label: 'Home',
        name: 'Ani',
        phone: '0899999',
        email: 'ani@example.com',
        address: 'Jl. Rumah No. 2',
        cityId: city.id,
      },
    });
    createdReceiverIds.push(receiver.id);
    const product = await createProduct({ stock: 5 });
    await createMemberCartWithItem(user.id, product.id, 1);

    const { response, json } = await post(
      { useReceiverId: receiver.id, paymentMethod: 'EWALLET' },
      `session=${token}`,
    );

    expect(response.status).toBe(201);

    const order = await prisma.order.findUnique({ where: { id: json.orderId } });
    expect(order?.userId).toBe(user.id);
    expect(order?.receiverName).toBe('Ani');
    expect(order?.receiverAddress).toBe('Jl. Rumah No. 2');
  });

  it('applies a percent voucher discount and increments usedCount', async () => {
    const city = await createCity();
    const product = await createProduct({ stock: 5, finalPrice: 100000 });
    const guestToken = await createGuestCartWithItem(product.id, 1);
    const adminUser = await createTestUser('ADMIN');

    const code = `VCH-${randomUUID()}`;
    createdVoucherCodes.push(code);
    await prisma.voucher.create({
      data: {
        code,
        type: 'PERCENT',
        value: 10,
        minPurchase: 0,
        channel: 'ONLINE',
        isActive: true,
        createdByUserId: adminUser.id,
      },
    });

    const { response, json } = await post(
      receiverPayload(city.id, { voucherCode: code }),
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );

    expect(response.status).toBe(201);

    const order = await prisma.order.findUnique({ where: { id: json.orderId } });
    expect(order?.voucherDiscount).toBe(10000);
    expect(order?.discount).toBe(10000);
    expect(order?.total).toBe(100000 + city.shippingCost - 10000);

    const voucher = await prisma.voucher.findUnique({ where: { code } });
    expect(voucher?.usedCount).toBe(1);

    const redemption = await prisma.voucherRedemption.findUnique({
      where: { orderId: json.orderId },
    });
    expect(redemption?.discountAmount).toBe(10000);
  });

  it('rejects an invalid voucher code without creating the order', async () => {
    const city = await createCity();
    const product = await createProduct({ stock: 5 });
    const guestToken = await createGuestCartWithItem(product.id, 1);

    const { response } = await post(
      receiverPayload(city.id, { voucherCode: 'DOES-NOT-EXIST' }),
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );

    expect(response.status).toBe(400);

    const unchangedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(unchangedProduct?.stock).toBe(5);
  });

  it('sets the affiliate user when a valid affiliate code is provided', async () => {
    const city = await createCity();
    const product = await createProduct({ stock: 5 });
    const guestToken = await createGuestCartWithItem(product.id, 1);
    const affiliateOwner = await createTestUser();
    const affiliateCode = `AFF-${randomUUID()}`;
    await prisma.affiliateProfile.create({
      data: {
        userId: affiliateOwner.id,
        code: affiliateCode,
        payoutBankName: 'Bank',
        payoutBankAccount: '123',
        payoutBankHolder: 'Affiliate Owner',
        isActive: true,
      },
    });

    const { response, json } = await post(
      receiverPayload(city.id, { affiliateCode }),
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );

    expect(response.status).toBe(201);

    const order = await prisma.order.findUnique({ where: { id: json.orderId } });
    expect(order?.affiliateUserId).toBe(affiliateOwner.id);
    expect(order?.affiliateCode).toBe(affiliateCode);
  });

  it('ignores an invalid affiliate code without failing the order', async () => {
    const city = await createCity();
    const product = await createProduct({ stock: 5 });
    const guestToken = await createGuestCartWithItem(product.id, 1);

    const { response, json } = await post(
      receiverPayload(city.id, { affiliateCode: 'NOT-REAL' }),
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );

    expect(response.status).toBe(201);

    const order = await prisma.order.findUnique({ where: { id: json.orderId } });
    expect(order?.affiliateUserId).toBeNull();
  });
});

describe('GET /api/orders', () => {
  afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  function buildListRequest(cookie?: string, query = '') {
    return new NextRequest(`http://localhost/api/orders${query}`, {
      method: 'GET',
      headers: cookie ? { cookie } : undefined,
    });
  }

  async function createOrderForUser(
    userId: string,
    status: 'AWAITING_PAYMENT' | 'COMPLETED' = 'AWAITING_PAYMENT',
  ) {
    const product = await createProduct();
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-TEST-${randomUUID()}`,
        userId,
        receiverName: 'Test',
        receiverPhone: '0812',
        receiverEmail: 'test@example.com',
        receiverAddress: 'Addr',
        receiverCity: 'City',
        subtotal: 10000,
        shippingCost: 5000,
        discount: 0,
        total: 15000,
        paymentMethod: 'BANK_TRANSFER',
        source: 'ONLINE',
        status,
        items: {
          create: {
            productId: product.id,
            titleSnapshot: product.title,
            priceSnapshot: product.finalPrice,
            discountPercentSnapshot: 0,
            quantity: 1,
            lineTotal: product.finalPrice,
          },
        },
      },
    });
    createdOrderIds.push(order.id);
    return order;
  }

  it('returns 401 when there is no session', async () => {
    const response = await GET(buildListRequest());
    expect(response.status).toBe(401);
  });

  it("returns only the requesting member's orders", async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();
    const { token } = await createSession({ userId: user.id });

    await createOrderForUser(user.id);
    await createOrderForUser(otherUser.id);

    const response = await GET(buildListRequest(`session=${token}`));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(json.total).toBe(1);
  });

  it('filters by status', async () => {
    const user = await createTestUser();
    const { token } = await createSession({ userId: user.id });

    await createOrderForUser(user.id, 'AWAITING_PAYMENT');
    await createOrderForUser(user.id, 'COMPLETED');

    const response = await GET(buildListRequest(`session=${token}`, '?status=COMPLETED'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].status).toBe('COMPLETED');
  });
});
