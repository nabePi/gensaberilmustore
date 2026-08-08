import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { PATCH } from '@/app/api/admin/orders/[id]/status/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];
const createdAffiliateProfileIds: string[] = [];

async function createTestUser(role: 'BUYER' | 'ADMIN' | 'AFFILIATE' = 'BUYER') {
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

async function createOrder(
  overrides: Partial<Parameters<typeof prisma.order.create>[0]['data']> = {},
  quantity = 2,
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
          quantity,
          lineTotal: product.finalPrice * quantity,
        },
      },
      ...overrides,
    },
  });
  createdOrderIds.push(order.id);
  return { order, product };
}

function buildRequest(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/admin/orders/x/status', {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/admin/orders/[id]/status', () => {
  afterAll(async () => {
    await prisma.affiliateConversion.deleteMany({
      where: { orderId: { in: createdOrderIds } },
    });
    await prisma.affiliateProfile.deleteMany({
      where: { id: { in: createdAffiliateProfileIds } },
    });
    await prisma.notification.deleteMany({ where: { relatedOrderId: { in: createdOrderIds } } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without an admin session', async () => {
    const response = await PATCH(buildRequest({ toStatus: 'PAID' }), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a non-existent order', async () => {
    const cookie = await createAdminCookie();
    const response = await PATCH(buildRequest({ toStatus: 'PAID' }, cookie), context(randomUUID()));
    expect(response.status).toBe(404);
  });

  it('rejects an invalid status transition', async () => {
    const cookie = await createAdminCookie();
    const { order } = await createOrder();

    const response = await PATCH(buildRequest({ toStatus: 'SHIPPED' }, cookie), context(order.id));

    expect(response.status).toBe(400);
  });

  it('transitions AWAITING_PAYMENT to PAID and queues payment notifications', async () => {
    const cookie = await createAdminCookie();
    const { order } = await createOrder();

    const response = await PATCH(
      buildRequest({ toStatus: 'PAID', note: 'Pembayaran dikonfirmasi' }, cookie),
      context(order.id),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('PAID');
    expect(json.history).toHaveLength(1);
    expect(json.history[0].note).toBe('Pembayaran dikonfirmasi');

    const notifications = await prisma.notification.findMany({
      where: { relatedOrderId: order.id },
    });
    expect(notifications).toHaveLength(2);
    expect(notifications.every((n) => n.template === 'PAYMENT_RECEIVED')).toBe(true);
  });

  it('restores product stock when an order is cancelled', async () => {
    const cookie = await createAdminCookie();
    const { order, product } = await createOrder({}, 3);

    const response = await PATCH(
      buildRequest({ toStatus: 'CANCELLED' }, cookie),
      context(order.id),
    );
    expect(response.status).toBe(200);

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct?.stock).toBe(product.stock + 3);
  });

  it('approves the affiliate conversion when an order is completed', async () => {
    const cookie = await createAdminCookie();
    const affiliateUser = await createTestUser('AFFILIATE');
    const affiliateProfile = await prisma.affiliateProfile.create({
      data: {
        userId: affiliateUser.id,
        code: `AFF-${randomUUID()}`,
        payoutBankName: 'Bank',
        payoutBankAccount: '123',
        payoutBankHolder: 'Holder',
      },
    });
    createdAffiliateProfileIds.push(affiliateProfile.id);

    const { order } = await createOrder({
      status: 'SHIPPED',
      affiliateUserId: affiliateUser.id,
      affiliateCode: affiliateProfile.code,
    });

    const response = await PATCH(
      buildRequest({ toStatus: 'COMPLETED' }, cookie),
      context(order.id),
    );
    expect(response.status).toBe(200);

    const conversion = await prisma.affiliateConversion.findUnique({
      where: { orderId: order.id },
    });
    expect(conversion?.status).toBe('APPROVED');
    expect(conversion?.approvedAt).not.toBeNull();
  });
});
