import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/reports/laporan/route';
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
      title: `Laporan Product ${randomUUID()}`,
      subtitle: '',
      author: 'Author',
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

async function createOrder(status: 'PAID' | 'COMPLETED' | 'CANCELLED', total: number) {
  const product = await createProduct();
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-LAP-${randomUUID()}`,
      receiverName: 'Budi',
      receiverPhone: '08123456789',
      receiverEmail: 'budi@example.com',
      receiverAddress: 'Addr',
      receiverCity: 'City',
      subtotal: total,
      shippingCost: 0,
      discount: 0,
      total,
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

function buildRequest(url: string, cookie?: string) {
  return new NextRequest(url, { method: 'GET', headers: cookie ? { cookie } : undefined });
}

afterAll(async () => {
  await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/reports/laporan', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('http://localhost/api/admin/reports/laporan'));
    expect(response.status).toBe(401);
  });

  it('rejects an invalid period', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(
      buildRequest('http://localhost/api/admin/reports/laporan?period=invalid', cookie),
    );
    expect(response.status).toBe(400);
  });

  it('returns stats, status breakdown, top products, and sales by day', async () => {
    const cookie = await createAdminCookie();
    await createOrder('PAID', 50000);
    await createOrder('COMPLETED', 80000);
    await createOrder('CANCELLED', 20000);

    const response = await GET(
      buildRequest('http://localhost/api/admin/reports/laporan?period=all', cookie),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.stats.totalOrders).toBeGreaterThanOrEqual(3);
    expect(json.stats.totalRevenue).toBeGreaterThanOrEqual(130000);
    expect(Array.isArray(json.statusBreakdown)).toBe(true);
    expect(Array.isArray(json.topProducts)).toBe(true);
    expect(Array.isArray(json.salesByDay)).toBe(true);
  });

  it('defaults to period=all when not provided', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest('http://localhost/api/admin/reports/laporan', cookie));
    expect(response.status).toBe(200);
  });
});
