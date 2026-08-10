import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';

const createSnapTransaction = vi.fn();

vi.mock('@/server/payment/midtrans', () => ({
  createSnapTransaction: (...args: unknown[]) => createSnapTransaction(...args),
}));

const { POST } = await import('@/app/api/payment/create/route');

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];

async function createTestUser() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({ data: { email, passwordHash, name: 'Test User', role: 'BUYER' } });
}

async function createProduct() {
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
    },
  });
  createdProductIds.push(product.id);
  return product;
}

async function createOrder(
  overrides: { userId?: string | null; status?: 'AWAITING_PAYMENT' | 'PAID' } = {},
) {
  const product = await createProduct();
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-${randomUUID()}`,
      userId: null,
      receiverName: 'Test',
      receiverPhone: '0812',
      receiverEmail: 'test@example.com',
      receiverAddress: 'Addr',
      receiverCity: 'City',
      subtotal: 100000,
      shippingCost: 15000,
      discount: 0,
      total: 115000,
      paymentMethod: 'BANK_TRANSFER',
      source: 'ONLINE',
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
      ...overrides,
    },
  });
  createdOrderIds.push(order.id);
  return order;
}

function buildRequest(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/payment/create', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

describe('POST /api/payment/create', () => {
  afterAll(async () => {
    await prisma.paymentSession.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('rejects an invalid payload', async () => {
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(400);
  });

  it('returns 404 when the order does not exist', async () => {
    const response = await POST(buildRequest({ orderId: randomUUID() }));
    expect(response.status).toBe(404);
  });

  it('returns 404 when the order belongs to another member', async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const order = await createOrder({ userId: owner.id });
    const { token } = await createSession({ userId: other.id });

    const response = await POST(buildRequest({ orderId: order.id }, `session=${token}`));
    expect(response.status).toBe(404);
  });

  it('rejects when the order is not awaiting payment', async () => {
    const order = await createOrder({ status: 'PAID' });

    const response = await POST(buildRequest({ orderId: order.id }));
    expect(response.status).toBe(400);
  });

  it('creates a Snap transaction for a guest order and stores the payment session', async () => {
    createSnapTransaction.mockResolvedValueOnce({
      snapToken: 'snap-token-123',
      redirectUrl: 'https://app.sandbox.midtrans.com/snap/v3/redirection/snap-token-123',
    });
    const order = await createOrder();

    const response = await POST(buildRequest({ orderId: order.id }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.snapToken).toBe('snap-token-123');
    expect(createSnapTransaction).toHaveBeenCalledTimes(1);

    const session = await prisma.paymentSession.findUnique({ where: { orderId: order.id } });
    expect(session?.snapToken).toBe('snap-token-123');
  });

  it('reuses an existing unexpired payment session instead of calling Midtrans again', async () => {
    createSnapTransaction.mockClear();
    const order = await createOrder();
    await prisma.paymentSession.create({
      data: {
        orderId: order.id,
        snapToken: 'cached-token',
        snapRedirectUrl: 'https://app.sandbox.midtrans.com/snap/v3/redirection/cached-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const response = await POST(buildRequest({ orderId: order.id }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.snapToken).toBe('cached-token');
    expect(createSnapTransaction).not.toHaveBeenCalled();
  });
});
