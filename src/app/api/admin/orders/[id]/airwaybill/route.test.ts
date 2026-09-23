import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/admin/orders/[id]/airwaybill/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];
const createdDestinationIds: string[] = [];

async function createAdminCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const admin = await prisma.user.create({
    data: { email, passwordHash, name: 'Test Admin', role: 'ADMIN' },
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

async function createDestination() {
  const destination = await prisma.destination.create({
    data: {
      countryName: 'INDONESIA',
      provinceName: 'Test Province',
      cityName: `City ${randomUUID()}`,
      districtName: 'Test District',
      subdistrictName: 'Test Subdistrict',
      zipCode: '12345',
      tariffCode: 'JKT10000',
    },
  });
  createdDestinationIds.push(destination.id);
  return destination;
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
      subtotal: 10000,
      shippingCost: 5000,
      discount: 0,
      total: 15000,
      paymentMethod: 'BANK_TRANSFER',
      source: 'ONLINE',
      status: 'AWAITING_PAYMENT',
      shippingMethod: 'JNE',
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

function buildRequest(cookie?: string) {
  return new NextRequest('http://localhost/api/admin/orders/x/airwaybill', {
    method: 'POST',
    headers: cookie ? { cookie } : undefined,
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/admin/orders/[id]/airwaybill', () => {
  afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.destination.deleteMany({ where: { id: { in: createdDestinationIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without an admin session', async () => {
    const response = await POST(buildRequest(), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a non-existent order', async () => {
    const cookie = await createAdminCookie();
    const response = await POST(buildRequest(cookie), context(randomUUID()));
    expect(response.status).toBe(404);
  });

  it('rejects orders that do not use JNE shipping', async () => {
    const cookie = await createAdminCookie();
    const order = await createOrder({ shippingMethod: 'SELF_PICKUP', status: 'PAID' });

    const response = await POST(buildRequest(cookie), context(order.id));
    expect(response.status).toBe(400);
  });

  it('rejects orders that are not paid yet', async () => {
    const cookie = await createAdminCookie();
    const order = await createOrder({ status: 'AWAITING_PAYMENT' });

    const response = await POST(buildRequest(cookie), context(order.id));
    expect(response.status).toBe(400);
  });

  it('rejects orders that already have an airwaybill number', async () => {
    const cookie = await createAdminCookie();
    const order = await createOrder({ status: 'PAID', airwaybillNumber: 'JNE123' });

    const response = await POST(buildRequest(cookie), context(order.id));
    expect(response.status).toBe(400);
  });

  it('returns 502 and leaves airwaybillNumber unset when JNE config is missing', async () => {
    const cookie = await createAdminCookie();
    const destination = await createDestination();
    const order = await createOrder({ status: 'PAID', destinationId: destination.id });

    const response = await POST(buildRequest(cookie), context(order.id));
    expect(response.status).toBe(502);

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.airwaybillNumber).toBeNull();
  });
});
