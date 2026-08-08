import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/orders/route';
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

async function createOrder(
  overrides: Partial<Parameters<typeof prisma.order.create>[0]['data']> = {},
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
      shippingCost: 5000,
      discount: 0,
      total: 15000,
      paymentMethod: 'BANK_TRANSFER',
      source: 'ONLINE',
      status: 'AWAITING_PAYMENT',
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

function buildRequest(cookie?: string, query = '') {
  return new NextRequest(`http://localhost/api/admin/orders${query}`, {
    method: 'GET',
    headers: cookie ? { cookie } : undefined,
  });
}

describe('GET /api/admin/orders', () => {
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

  it('lists orders with aggregates', async () => {
    const cookie = await createAdminCookie();
    await createOrder({ total: 15000 });
    await createOrder({ total: 25000 });

    const response = await GET(buildRequest(cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items.length).toBeGreaterThanOrEqual(2);
    expect(json.aggregates.totalOrders).toBe(json.total);
    expect(json.aggregates.totalRevenue).toBeGreaterThanOrEqual(40000);
  });

  it('filters by search query on receiver name', async () => {
    const cookie = await createAdminCookie();
    const uniqueName = `Unique-${randomUUID()}`;
    await createOrder({ receiverName: uniqueName });

    const response = await GET(buildRequest(cookie, `?q=${uniqueName}`));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].receiverName).toBe(uniqueName);
  });

  it('filters by multiple statuses', async () => {
    const cookie = await createAdminCookie();
    const marker = randomUUID();
    await createOrder({ status: 'PAID', receiverName: marker });
    await createOrder({ status: 'CANCELLED', receiverName: marker });
    await createOrder({ status: 'AWAITING_PAYMENT', receiverName: marker });

    const response = await GET(buildRequest(cookie, `?q=${marker}&status=PAID&status=CANCELLED`));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(2);
    expect(
      json.items.every((item: { status: string }) => ['PAID', 'CANCELLED'].includes(item.status)),
    ).toBe(true);
  });

  it('rejects an invalid status value', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest(cookie, '?status=NOT_A_STATUS'));
    expect(response.status).toBe(400);
  });

  it('filters by source', async () => {
    const cookie = await createAdminCookie();
    const marker = randomUUID();
    await createOrder({ source: 'POS', receiverName: marker });
    await createOrder({ source: 'ONLINE', receiverName: marker });

    const response = await GET(buildRequest(cookie, `?q=${marker}&source=POS`));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].source).toBe('POS');
  });
});
