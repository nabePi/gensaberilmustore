import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/orders/[id]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';

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

async function createOrderForUser(userId: string | null) {
  const product = await createProduct();
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-${randomUUID()}`,
      userId,
      receiverName: 'Test',
      receiverPhone: '0812',
      receiverEmail: 'test@example.com',
      receiverAddress: 'Addr',
      receiverCity: 'City',
      subtotal: 10000,
      shippingCost: 5000,
      discount: 0,
      total: 15000,
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
      history: {
        create: {
          fromStatus: 'AWAITING_PAYMENT',
          toStatus: 'AWAITING_PAYMENT',
          note: 'Order dibuat',
        },
      },
    },
  });
  createdOrderIds.push(order.id);
  return order;
}

function buildRequest(cookie?: string) {
  return new NextRequest('http://localhost/api/orders/x', {
    method: 'GET',
    headers: cookie ? { cookie } : undefined,
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/orders/[id]', () => {
  afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 when there is no session', async () => {
    const response = await GET(buildRequest(), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 when the order does not exist', async () => {
    const user = await createTestUser();
    const { token } = await createSession({ userId: user.id });

    const response = await GET(buildRequest(`session=${token}`), context(randomUUID()));
    expect(response.status).toBe(404);
  });

  it('returns 404 when the order belongs to another member', async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const { token } = await createSession({ userId: other.id });
    const order = await createOrderForUser(owner.id);

    const response = await GET(buildRequest(`session=${token}`), context(order.id));
    expect(response.status).toBe(404);
  });

  it('returns the full order detail with items and history', async () => {
    const user = await createTestUser();
    const { token } = await createSession({ userId: user.id });
    const order = await createOrderForUser(user.id);

    const response = await GET(buildRequest(`session=${token}`), context(order.id));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.orderNumber).toBe(order.orderNumber);
    expect(json.items).toHaveLength(1);
    expect(json.history).toHaveLength(1);
    expect(json.pricing.total).toBe(15000);
  });
});
