import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';

const getStatus = vi.fn();

vi.mock('@/server/payment/midtrans', () => ({
  getStatus: (...args: unknown[]) => getStatus(...args),
}));

const { GET } = await import('@/app/api/payment/status/[orderId]/route');

const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];

async function createProduct(stock = 10) {
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
      stock,
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

async function createOrder(overrides: { status?: 'AWAITING_PAYMENT' | 'PACKED' } = {}) {
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
      shippingCost: 0,
      discount: 0,
      total: 100000,
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

function buildRequest() {
  return new NextRequest('http://localhost/api/payment/status/x', { method: 'GET' });
}

function context(orderId: string) {
  return { params: Promise.resolve({ orderId }) };
}

describe('GET /api/payment/status/[orderId]', () => {
  afterAll(async () => {
    await prisma.paymentSession.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  });

  it('returns 404 when the order does not exist', async () => {
    const response = await GET(buildRequest(), context(randomUUID()));
    expect(response.status).toBe(404);
  });

  it('polls Midtrans and updates the order when still awaiting payment', async () => {
    getStatus.mockResolvedValueOnce({
      transactionStatus: 'settlement',
      fraudStatus: null,
      vaNumber: null,
    });
    const order = await createOrder();
    await prisma.paymentSession.create({
      data: {
        orderId: order.id,
        snapToken: 'token',
        snapRedirectUrl: 'https://app.sandbox.midtrans.com/snap/v3/redirection/token',
      },
    });

    const response = await GET(buildRequest(), context(order.id));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.orderStatus).toBe('PAID');
    expect(json.transactionStatus).toBe('settlement');
  });

  it('does not poll Midtrans when the order is no longer awaiting payment', async () => {
    getStatus.mockClear();
    const order = await createOrder({ status: 'PACKED' });

    const response = await GET(buildRequest(), context(order.id));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.orderStatus).toBe('PACKED');
    expect(getStatus).not.toHaveBeenCalled();
  });
});
