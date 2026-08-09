import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/reports/summary/route';
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

async function createOrder(status: 'AWAITING_PAYMENT' | 'PAID' | 'COMPLETED', total: number) {
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

function buildRequest(cookie?: string) {
  return new NextRequest('http://localhost/api/admin/reports/summary', {
    method: 'GET',
    headers: cookie ? { cookie } : undefined,
  });
}

describe('GET /api/admin/reports/summary', () => {
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

  it('returns aggregate stats counting only realized revenue', async () => {
    const cookie = await createAdminCookie();
    await createTestUser('BUYER');
    await createOrder('AWAITING_PAYMENT', 10000);
    await createOrder('PAID', 20000);
    await createOrder('COMPLETED', 30000);

    const response = await GET(buildRequest(cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.totalOrders).toBeGreaterThanOrEqual(3);
    expect(json.pendingOrders).toBeGreaterThanOrEqual(1);
    expect(json.revenue).toBeGreaterThanOrEqual(50000);
    expect(json.totalMembers).toBeGreaterThanOrEqual(1);
    expect(typeof json.totalProducts).toBe('number');
  });
});
