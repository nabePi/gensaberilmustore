import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/reports/top-products/route';
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
  status: 'AWAITING_PAYMENT' | 'PAID' | 'COMPLETED',
  productId: string,
  quantity: number,
  lineTotal: number,
) {
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-${randomUUID()}`,
      receiverName: 'Budi Santoso',
      receiverPhone: '08123456789',
      receiverEmail: 'budi@example.com',
      receiverAddress: 'Addr',
      receiverCity: 'City',
      subtotal: lineTotal,
      shippingCost: 0,
      discount: 0,
      total: lineTotal,
      paymentMethod: 'BANK_TRANSFER',
      source: 'ONLINE',
      status,
      items: {
        create: {
          productId,
          titleSnapshot: 'Snapshot',
          priceSnapshot: lineTotal,
          discountPercentSnapshot: 0,
          quantity,
          lineTotal,
        },
      },
    },
  });
  createdOrderIds.push(order.id);
  return order;
}

function buildRequest(cookie?: string, params?: Record<string, string>) {
  const url = new URL('http://localhost/api/admin/reports/top-products');
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url, {
    method: 'GET',
    headers: cookie ? { cookie } : undefined,
  });
}

describe('GET /api/admin/reports/top-products', () => {
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

  it('returns top products sorted by revenue, excluding non-realized orders', async () => {
    const cookie = await createAdminCookie();
    const productA = await createProduct();
    const productB = await createProduct();

    await createOrder('PAID', productA.id, 2, 40000);
    await createOrder('COMPLETED', productA.id, 1, 20000);
    await createOrder('AWAITING_PAYMENT', productB.id, 5, 999999);
    await createOrder('PAID', productB.id, 1, 5000);

    const response = await GET(buildRequest(cookie, { period: 'all_time', limit: '100' }));
    const json = await response.json();

    expect(response.status).toBe(200);
    const entryA = json.items.find((item: { productId: string }) => item.productId === productA.id);
    const entryB = json.items.find((item: { productId: string }) => item.productId === productB.id);
    expect(entryA.quantity).toBe(3);
    expect(entryA.revenue).toBe(60000);
    expect(entryB.revenue).toBe(5000);
    expect(json.totalRevenue).toBeGreaterThanOrEqual(65000);
    const sorted = [...json.items].sort(
      (a: { revenue: number }, b: { revenue: number }) => b.revenue - a.revenue,
    );
    expect(json.items).toEqual(sorted);
  });

  it('rejects an invalid limit', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest(cookie, { limit: '0' }));
    expect(response.status).toBe(400);
  });
});
