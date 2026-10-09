import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/affiliate/stats/products/[productId]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];

async function createAffiliate() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword('Password123'),
      name: 'Aff',
      role: 'AFFILIATE',
    },
  });
  const profile = await prisma.affiliateProfile.create({
    data: {
      userId: user.id,
      code: `AFF-${randomUUID()}`,
      payoutBankName: 'Bank',
      payoutBankAccount: '1',
      payoutBankHolder: 'H',
      status: 'APPROVED',
    },
  });
  const { token } = await createSession({ userId: user.id });
  return { user, profile, cookie: `session=${token}` };
}

async function createProduct() {
  const product = await prisma.product.create({
    data: {
      sku: `SKU-${randomUUID()}`,
      slug: `slug-${randomUUID()}`,
      title: `Detail Product ${randomUUID()}`,
      subtitle: '',
      author: 'A',
      description: 'D',
      price: 100000,
      finalPrice: 100000,
      stock: 10,
      weightGram: 100,
      pageCount: 100,
      coverType: 'SOFTCOVER',
      publishYear: 2024,
      isActive: true,
      commissionRate: { create: { percent: 10 } },
    },
  });
  createdProductIds.push(product.id);
  return product;
}

async function createOrderWithConversion(
  userId: string,
  profileId: string,
  productId: string,
  orderStatus: 'PAID' | 'COMPLETED' | 'CANCELLED',
  conversionStatus: 'PENDING' | 'APPROVED' | 'REJECTED',
) {
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-${randomUUID()}`,
      receiverName: 'Budi',
      receiverPhone: '0812',
      receiverAddress: 'Addr',
      subtotal: 100000,
      shippingCost: 0,
      discount: 0,
      total: 100000,
      paymentMethod: 'BANK_TRANSFER',
      source: 'ONLINE',
      status: orderStatus,
      affiliateUserId: userId,
      items: {
        create: {
          productId,
          titleSnapshot: 'Item',
          priceSnapshot: 100000,
          discountPercentSnapshot: 0,
          quantity: 1,
          lineTotal: 100000,
        },
      },
    },
  });
  createdOrderIds.push(order.id);
  await prisma.affiliateConversion.create({
    data: {
      affiliateProfileId: profileId,
      orderId: order.id,
      commissionAmount: 10000,
      status: conversionStatus,
    },
  });
}

function request(cookie?: string) {
  return new NextRequest('http://localhost/api/affiliate/stats/products/x', {
    headers: cookie ? { cookie } : undefined,
  });
}

function context(productId: string) {
  return { params: Promise.resolve({ productId }) };
}

afterAll(async () => {
  await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/affiliate/stats/products/[productId]', () => {
  it('returns 401 without a session', async () => {
    const response = await GET(request(), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a product the affiliate did not select', async () => {
    const { cookie } = await createAffiliate();
    const product = await createProduct();
    const response = await GET(request(cookie), context(product.id));
    expect(response.status).toBe(404);
  });

  it('breaks down orders, sales and commission for the product', async () => {
    const { user, profile, cookie } = await createAffiliate();
    const product = await createProduct();
    await prisma.affiliateProductSelection.create({
      data: { affiliateProfileId: profile.id, productId: product.id },
    });
    await prisma.affiliateClick.create({
      data: {
        affiliateProfileId: profile.id,
        productId: product.id,
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
        cookieId: randomUUID(),
      },
    });
    await createOrderWithConversion(user.id, profile.id, product.id, 'COMPLETED', 'APPROVED');
    await createOrderWithConversion(user.id, profile.id, product.id, 'PAID', 'PENDING');
    await createOrderWithConversion(user.id, profile.id, product.id, 'CANCELLED', 'REJECTED');

    const response = await GET(request(cookie), context(product.id));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.totals).toMatchObject({
      clicks: 1,
      unitsSold: 1,
      salesValue: 100000,
      commissionEarned: 10000,
      commissionPending: 10000,
      commissionPaid: 0,
    });
    expect(json.totals.orders).toEqual({
      total: 3,
      awaitingPayment: 0,
      processing: 1,
      completed: 1,
      cancelled: 1,
    });
    expect(json.daily).toHaveLength(30);
    expect(json.recentOrders).toHaveLength(3);
  });
});
