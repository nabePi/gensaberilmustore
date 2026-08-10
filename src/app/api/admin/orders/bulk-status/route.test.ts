import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/admin/orders/bulk-status/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];

async function createTestUser(role: 'BUYER' | 'ADMIN' = 'BUYER') {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({ data: { email, passwordHash, name: 'Test User', role } });
}

async function createAdminCookie() {
  const admin = await createTestUser('ADMIN');
  const { token } = await createSession({ userId: admin.id });
  return `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
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

async function createOrder(status: 'AWAITING_PAYMENT' | 'PAID' = 'AWAITING_PAYMENT') {
  const product = await createProduct();
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-${randomUUID()}`,
      receiverName: 'Budi Santoso',
      receiverPhone: '08123456789',
      receiverEmail: 'budi@example.com',
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

function buildRequest(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/admin/orders/bulk-status', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

describe('POST /api/admin/orders/bulk-status', () => {
  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { relatedOrderId: { in: createdOrderIds } } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without an admin session', async () => {
    const response = await POST(buildRequest({ orderIds: [randomUUID()], toStatus: 'PAID' }));
    expect(response.status).toBe(401);
  });

  it('rejects a payload with more than 100 order ids', async () => {
    const cookie = await createAdminCookie();
    const orderIds = Array.from({ length: 101 }, () => randomUUID());

    const response = await POST(buildRequest({ orderIds, toStatus: 'PAID' }, cookie));
    expect(response.status).toBe(400);
  });

  it('reports per-order success and failure without aborting the batch', async () => {
    const cookie = await createAdminCookie();
    const orderA = await createOrder('AWAITING_PAYMENT');
    const orderB = await createOrder('PAID');

    const response = await POST(
      buildRequest({ orderIds: [orderA.id, orderB.id], toStatus: 'PAID' }, cookie),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toEqual([orderA.id]);
    expect(json.failed).toHaveLength(1);
    expect(json.failed[0].id).toBe(orderB.id);

    const updatedOrderA = await prisma.order.findUnique({ where: { id: orderA.id } });
    expect(updatedOrderA?.status).toBe('PAID');

    const notification = await prisma.notification.findFirst({
      where: { relatedOrderId: orderA.id, template: 'PAYMENT_RECEIVED' },
    });
    expect(notification).not.toBeNull();
  });

  it('reports failure for order ids that do not exist', async () => {
    const cookie = await createAdminCookie();
    const missingId = randomUUID();

    const response = await POST(buildRequest({ orderIds: [missingId], toStatus: 'PAID' }, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toEqual([]);
    expect(json.failed).toEqual([{ id: missingId, reason: 'Order tidak ditemukan' }]);
  });
});
