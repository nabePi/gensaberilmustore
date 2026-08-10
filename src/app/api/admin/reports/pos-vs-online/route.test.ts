import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/reports/pos-vs-online/route';
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

async function createOrder(source: 'ONLINE' | 'POS', total: number) {
  const product = await createProduct();
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-${randomUUID()}`,
      receiverName: 'Budi Santoso',
      receiverPhone: '08123456789',
      receiverEmail: 'budi@example.com',
      receiverAddress: 'Addr',
      receiverCity: 'City',
      subtotal: total,
      shippingCost: 0,
      discount: 0,
      total,
      paymentMethod: source === 'POS' ? 'POS_CASH' : 'BANK_TRANSFER',
      source,
      status: 'PAID',
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
  const url = new URL('http://localhost/api/admin/reports/pos-vs-online');
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url, {
    method: 'GET',
    headers: cookie ? { cookie } : undefined,
  });
}

describe('GET /api/admin/reports/pos-vs-online', () => {
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

  it('groups orders by source', async () => {
    const cookie = await createAdminCookie();

    await createOrder('ONLINE', 15000);
    await createOrder('POS', 25000);

    const response = await GET(buildRequest(cookie, { period: 'all_time' }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ONLINE.orders).toBeGreaterThanOrEqual(1);
    expect(json.ONLINE.revenue).toBeGreaterThanOrEqual(15000);
    expect(json.POS.orders).toBeGreaterThanOrEqual(1);
    expect(json.POS.revenue).toBeGreaterThanOrEqual(25000);
  });

  it('rejects an invalid period', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest(cookie, { period: 'bogus' }));
    expect(response.status).toBe(400);
  });
});
