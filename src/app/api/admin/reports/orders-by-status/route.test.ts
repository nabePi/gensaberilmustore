import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/reports/orders-by-status/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];

async function createAdminCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const admin = await prisma.user.create({
    data: { email, passwordHash, name: 'Admin', role: 'ADMIN' },
  });
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

async function createOrder(
  status: 'AWAITING_PAYMENT' | 'PAID' | 'CANCELLED',
  source: 'ONLINE' | 'POS',
) {
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
      shippingCost: 0,
      discount: 0,
      total: 10000,
      paymentMethod: 'BANK_TRANSFER',
      source,
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

function buildRequest(cookie?: string, params?: Record<string, string>) {
  const url = new URL('http://localhost/api/admin/reports/orders-by-status');
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url, {
    method: 'GET',
    headers: cookie ? { cookie } : undefined,
  });
}

describe('GET /api/admin/reports/orders-by-status', () => {
  afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without an admin session', async () => {
    const response = await GET(buildRequest());
    expect(response.status).toBe(401);
  });

  it('rejects an invalid source', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest(cookie, { source: 'BOGUS' }));
    expect(response.status).toBe(400);
  });

  it('groups orders by status filtered by source', async () => {
    const cookie = await createAdminCookie();
    await createOrder('AWAITING_PAYMENT', 'ONLINE');
    await createOrder('PAID', 'ONLINE');
    await createOrder('PAID', 'POS');
    await createOrder('CANCELLED', 'ONLINE');

    const response = await GET(buildRequest(cookie, { period: 'all_time', source: 'ONLINE' }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.AWAITING_PAYMENT).toBeGreaterThanOrEqual(1);
    expect(json.PAID).toBeGreaterThanOrEqual(1);
    expect(json.CANCELLED).toBeGreaterThanOrEqual(1);

    const allResponse = await GET(buildRequest(cookie, { period: 'all_time', source: 'ALL' }));
    const allJson = await allResponse.json();
    expect(allJson.PAID).toBeGreaterThanOrEqual(2);
  });
});
