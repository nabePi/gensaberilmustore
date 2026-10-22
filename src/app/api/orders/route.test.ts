import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';
import { GUEST_CART_COOKIE_NAME } from '@/server/cart/cart';

const SHIPPING_COST = 15000;

vi.mock('@/server/shipping/jne-tariff', () => ({
  getShippingCost: async () => ({
    price: SHIPPING_COST,
    serviceCode: 'REG11',
    etdFrom: '2',
    etdThru: '3',
  }),
  JneTariffError: class JneTariffError extends Error {},
  isAllowedJneService: (value: string) =>
    value === 'REG' || value === 'YES' || value.startsWith('JTR'),
}));

const { GET, POST } = await import('@/app/api/orders/route');

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdCartIds: string[] = [];
const createdDestinationIds: string[] = [];
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

async function createDestination(
  overrides: Partial<Parameters<typeof prisma.destination.create>[0]['data']> = {},
) {
  const destination = await prisma.destination.create({
    data: {
      countryName: 'INDONESIA',
      provinceName: 'Test Province',
      cityName: `City ${randomUUID()}`,
      districtName: 'Test District',
      subdistrictName: 'Test Subdistrict',
      zipCode: '12345',
      tariffCode: 'JKT10000',
      ...overrides,
    },
  });
  createdDestinationIds.push(destination.id);
  return destination;
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

async function createMixedCart(poStock = 5) {
  const ready = await createProduct({ stock: 5, weightGram: 500 });
  const po = await createProduct({
    stock: poStock,
    isPreOrderActive: true,
    preOrderPrice: 90000,
    finalPrice: 90000,
    weightGram: 3500,
  });
  const guestToken = await createGuestCartWithItem(ready.id, 2);
  const cart = await prisma.cart.findUniqueOrThrow({ where: { guestToken } });
  await prisma.cartItem.create({
    data: { cartId: cart.id, productId: po.id, quantity: 1, priceSnapshot: 90000 },
  });
  return { ready, po, guestToken, cart };
}

function receiverPayload(destinationId: string, overrides: Record<string, unknown> = {}) {
  return {
    receiverName: 'Budi',
    receiverPhone: '08123456789',
    receiverEmail: 'budi@example.com',
    receiverAddress: 'Jl. Test No. 1',
    destinationId,
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
    await prisma.notification.deleteMany({ where: { relatedOrderId: { in: createdOrderIds } } });
    await prisma.voucherRedemption.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.voucher.deleteMany({ where: { code: { in: createdVoucherCodes } } });
    await prisma.receiver.deleteMany({ where: { id: { in: createdReceiverIds } } });
    await prisma.cartItem.deleteMany({ where: { cartId: { in: createdCartIds } } });
    await prisma.cart.deleteMany({ where: { id: { in: createdCartIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.destination.deleteMany({ where: { id: { in: createdDestinationIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('rejects an invalid payload', async () => {
    const { response } = await post({});
    expect(response.status).toBe(400);
  });

  it('rejects when the cart is empty', async () => {
    const destination = await createDestination();
    const { response } = await post(receiverPayload(destination.id));
    expect(response.status).toBe(400);
  });

  it('rejects mixed checkout without a group and keeps both items and their stock', async () => {
    const { ready, po, guestToken, cart } = await createMixedCart();
    const { response } = await post(
      { receiverName: 'Buyer', receiverPhone: '0812', shippingMethod: 'SELF_PICKUP' },
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );
    expect(response.status).toBe(400);
    expect(await prisma.cartItem.count({ where: { cartId: cart.id } })).toBe(2);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: ready.id } })).stock).toBe(5);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: po.id } })).stock).toBe(5);
  });

  it.each(['READY', 'PRE_ORDER'] as const)(
    'checks out only %s and keeps the other group accessible to the guest',
    async (checkoutGroup) => {
      const { ready, po, guestToken, cart } = await createMixedCart();
      const destination = await createDestination();
      const { response, json } = await post(
        receiverPayload(destination.id, { checkoutGroup }),
        `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
      );
      expect(response.status).toBe(201);
      const created = await prisma.order.findUniqueOrThrow({
        where: { id: json.orderId },
        include: { items: true },
      });
      expect(created.items).toHaveLength(1);
      expect(created.items[0]?.productId).toBe(checkoutGroup === 'READY' ? ready.id : po.id);
      expect(created.items[0]?.isPreOrderSnapshot).toBe(checkoutGroup === 'PRE_ORDER');
      expect(created.subtotal).toBe(checkoutGroup === 'READY' ? 200000 : 90000);
      expect(created.weightKg).toBe(checkoutGroup === 'READY' ? 1 : 4);
      expect(created.total).toBe(created.subtotal + SHIPPING_COST);
      const confirmation = await prisma.notification.findFirstOrThrow({
        where: { relatedOrderId: created.id, template: 'ORDER_CONFIRMED' },
      });
      expect(confirmation.payloadJson).toMatchObject({
        subtotal: created.subtotal,
        items: [{ title: checkoutGroup === 'READY' ? ready.title : po.title }],
      });
      const remaining = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.productId).toBe(checkoutGroup === 'READY' ? po.id : ready.id);
      expect(response.headers.get('set-cookie') ?? '').not.toContain(`${GUEST_CART_COOKIE_NAME}=;`);
      const otherGroup = checkoutGroup === 'READY' ? 'PRE_ORDER' : 'READY';
      const second = await post(
        receiverPayload(destination.id, { checkoutGroup: otherGroup }),
        `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
      );
      expect(second.response.status).toBe(201);
      expect(await prisma.cartItem.count({ where: { cartId: cart.id } })).toBe(0);
    },
  );

  it('does not let an out-of-stock PO item block ready checkout', async () => {
    const { guestToken } = await createMixedCart(0);
    const { response } = await post(
      {
        receiverName: 'Buyer',
        receiverPhone: '0812',
        shippingMethod: 'SELF_PICKUP',
        checkoutGroup: 'READY',
      },
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );
    expect(response.status).toBe(201);
  });

  it('keeps the other group in the member cart', async () => {
    const user = await createTestUser();
    const { token } = await createSession({ userId: user.id });
    const ready = await createProduct();
    const po = await createProduct({
      isPreOrderActive: true,
      preOrderPrice: 90000,
      finalPrice: 90000,
    });
    await createMemberCartWithItem(user.id, ready.id);
    const cart = await prisma.cart.findUniqueOrThrow({ where: { userId: user.id } });
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId: po.id, quantity: 1, priceSnapshot: 90000 },
    });
    const { response, json } = await post(
      {
        receiverName: 'Buyer',
        receiverPhone: '0812',
        shippingMethod: 'SELF_PICKUP',
        checkoutGroup: 'READY',
      },
      `session=${token}`,
    );
    expect(response.status).toBe(201);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: json.orderId } })).userId).toBe(
      user.id,
    );
    const remaining = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
    expect(remaining.map((item) => item.productId)).toEqual([po.id]);
  });

  it('does not order the same selected items twice during simultaneous checkout', async () => {
    const { ready, guestToken, cart } = await createMixedCart();
    const body = {
      receiverName: 'Buyer',
      receiverPhone: '0812',
      shippingMethod: 'SELF_PICKUP',
      checkoutGroup: 'READY',
    };
    const cookie = `${GUEST_CART_COOKIE_NAME}=${guestToken}`;
    const results = await Promise.all([post(body, cookie), post(body, cookie)]);
    expect(results.map(({ response }) => response.status).sort()).toEqual([201, 400]);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: ready.id } })).stock).toBe(3);
    expect(await prisma.cartItem.count({ where: { cartId: cart.id } })).toBe(1);
  });

  it('prevents a voucher from using the combined subtotal of the two groups', async () => {
    const { guestToken, cart } = await createMixedCart();
    const code = `PO-${randomUUID()}`;
    const admin = await createTestUser('ADMIN');
    createdVoucherCodes.push(code);
    await prisma.voucher.create({
      data: {
        code,
        type: 'FIXED',
        value: 10000,
        minPurchase: 250000,
        createdByUserId: admin.id,
        channel: 'ONLINE',
        isActive: true,
      },
    });
    const { response } = await post(
      {
        receiverName: 'Buyer',
        receiverPhone: '0812',
        shippingMethod: 'SELF_PICKUP',
        checkoutGroup: 'READY',
        voucherCode: code,
      },
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );
    expect(response.status).toBe(400);
    expect(await prisma.cartItem.count({ where: { cartId: cart.id } })).toBe(2);
    expect((await prisma.voucher.findUniqueOrThrow({ where: { code } })).usedCount).toBe(0);
  });

  it('creates a guest order, decrements stock, and clears the cart', async () => {
    const destination = await createDestination();
    const product = await createProduct({ stock: 5, discountPercent: 50, finalPrice: 50000 });
    const guestToken = await createGuestCartWithItem(product.id, 2);

    const { response, json } = await post(
      receiverPayload(destination.id),
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );

    expect(response.status).toBe(201);
    expect(json.orderNumber).toMatch(/^ORD-/);

    const order = await prisma.order.findUnique({ where: { id: json.orderId } });
    expect(order?.subtotal).toBe(100000);
    expect(order?.shippingCost).toBe(SHIPPING_COST);
    expect(order?.total).toBe(100000 + SHIPPING_COST);
    expect(order?.status).toBe('AWAITING_PAYMENT');

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct?.stock).toBe(3);

    const cart = await prisma.cart.findUnique({ where: { guestToken }, include: { items: true } });
    expect(cart?.items).toEqual([]);

    const setCookieHeader = response.headers.get('set-cookie');
    expect(setCookieHeader ?? '').not.toContain(`${GUEST_CART_COOKIE_NAME}=;`);

    const notification = await prisma.notification.findFirst({
      where: { relatedOrderId: json.orderId, template: 'ORDER_CONFIRMED' },
    });
    expect(notification?.recipient).toBe('budi@example.com');
  });

  it('preserves the PO flag on order items after the product settings change', async () => {
    const product = await createProduct({
      isPreOrderActive: true,
      preOrderPrice: 90000,
      finalPrice: 90000,
    });
    const guestToken = await createGuestCartWithItem(product.id);
    const { response, json } = await post(
      {
        receiverName: 'Buyer',
        receiverPhone: '0812',
        shippingMethod: 'SELF_PICKUP',
        paymentMethod: 'BANK_TRANSFER',
      },
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );
    expect(response.status).toBe(201);
    await prisma.product.update({ where: { id: product.id }, data: { isPreOrderActive: false } });
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: json.orderId } });
    expect(item.isPreOrderSnapshot).toBe(true);
  });

  it('rejects when stock is insufficient', async () => {
    const destination = await createDestination();
    const product = await createProduct({ stock: 1 });
    const guestToken = await createGuestCartWithItem(product.id, 5);

    const { response } = await post(
      receiverPayload(destination.id),
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );

    expect(response.status).toBe(400);

    const unchangedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(unchangedProduct?.stock).toBe(1);
  });

  it('creates a member order using a saved receiver', async () => {
    const user = await createTestUser();
    const { token } = await createSession({ userId: user.id });
    const destination = await createDestination();
    const receiver = await prisma.receiver.create({
      data: {
        userId: user.id,
        label: 'Home',
        name: 'Ani',
        phone: '0899999',
        email: 'ani@example.com',
        address: 'Jl. Rumah No. 2',
        destinationId: destination.id,
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
    const destination = await createDestination();
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
      receiverPayload(destination.id, { voucherCode: code }),
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );

    expect(response.status).toBe(201);

    const order = await prisma.order.findUnique({ where: { id: json.orderId } });
    expect(order?.voucherDiscount).toBe(10000);
    expect(order?.discount).toBe(10000);
    expect(order?.total).toBe(100000 + SHIPPING_COST - 10000);

    const voucher = await prisma.voucher.findUnique({ where: { code } });
    expect(voucher?.usedCount).toBe(1);

    const redemption = await prisma.voucherRedemption.findUnique({
      where: { orderId: json.orderId },
    });
    expect(redemption?.discountAmount).toBe(10000);
  });

  it('rejects an invalid voucher code without creating the order', async () => {
    const destination = await createDestination();
    const product = await createProduct({ stock: 5 });
    const guestToken = await createGuestCartWithItem(product.id, 1);

    const { response } = await post(
      receiverPayload(destination.id, { voucherCode: 'DOES-NOT-EXIST' }),
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );

    expect(response.status).toBe(400);

    const unchangedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(unchangedProduct?.stock).toBe(5);
  });

  it('sets the affiliate user when a valid affiliate code is provided', async () => {
    const destination = await createDestination();
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
      receiverPayload(destination.id, { affiliateCode }),
      `${GUEST_CART_COOKIE_NAME}=${guestToken}`,
    );

    expect(response.status).toBe(201);

    const order = await prisma.order.findUnique({ where: { id: json.orderId } });
    expect(order?.affiliateUserId).toBe(affiliateOwner.id);
    expect(order?.affiliateCode).toBe(affiliateCode);
  });

  it('ignores an invalid affiliate code without failing the order', async () => {
    const destination = await createDestination();
    const product = await createProduct({ stock: 5 });
    const guestToken = await createGuestCartWithItem(product.id, 1);

    const { response, json } = await post(
      receiverPayload(destination.id, { affiliateCode: 'NOT-REAL' }),
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
