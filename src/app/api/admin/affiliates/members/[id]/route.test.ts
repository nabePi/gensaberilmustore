import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { DELETE, PUT } from '@/app/api/admin/affiliates/members/[id]/rates/[productId]/route';
import { GET } from '@/app/api/admin/affiliates/members/[id]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];
const createdProfileIds: string[] = [];

async function createUser(role: 'ADMIN' | 'AFFILIATE') {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  return prisma.user.create({
    data: { email, passwordHash: await hashPassword('Password123'), name: 'Test', role },
  });
}

function call(id: string, cookie?: string) {
  return GET(
    new NextRequest(`http://localhost/api/admin/affiliates/members/${id}`, {
      headers: cookie ? { cookie } : undefined,
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe('GET /api/admin/affiliates/members/[id]', () => {
  afterAll(async () => {
    await prisma.affiliateWithdrawal.deleteMany({
      where: { affiliateProfileId: { in: createdProfileIds } },
    });
    await prisma.affiliateClick.deleteMany({
      where: { affiliateProfileId: { in: createdProfileIds } },
    });
    await prisma.affiliateConversion.deleteMany({
      where: { affiliateProfileId: { in: createdProfileIds } },
    });
    await prisma.affiliateMemberRate.deleteMany({
      where: { affiliateProfileId: { in: createdProfileIds } },
    });
    await prisma.affiliateProductSelection.deleteMany({
      where: { affiliateProfileId: { in: createdProfileIds } },
    });
    await prisma.affiliateProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('requires admin and 404s for unknown profiles', async () => {
    expect((await call(randomUUID())).status).toBe(401);
    const admin = await createUser('ADMIN');
    const { token } = await createSession({ userId: admin.id });
    expect((await call(randomUUID(), `${ADMIN_SESSION_COOKIE_NAME}=${token}`)).status).toBe(404);
  });

  it('returns per-product performance, commission and withdrawal recap', async () => {
    const admin = await createUser('ADMIN');
    const { token } = await createSession({ userId: admin.id });
    const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;

    const user = await createUser('AFFILIATE');
    const profile = await prisma.affiliateProfile.create({
      data: {
        userId: user.id,
        code: `AFF-${randomUUID()}`,
        payoutBankName: 'BCA',
        payoutBankAccount: '123',
        payoutBankHolder: 'Holder',
        status: 'APPROVED',
      },
    });
    createdProfileIds.push(profile.id);

    const product = await prisma.product.create({
      data: {
        sku: `SKU-${randomUUID()}`,
        slug: `slug-${randomUUID()}`,
        title: 'Produk Uji',
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
    await prisma.affiliateProductSelection.create({
      data: { affiliateProfileId: profile.id, productId: product.id },
    });
    await prisma.affiliateClick.createMany({
      data: [1, 2, 3, 4].map(() => ({
        affiliateProfileId: profile.id,
        productId: product.id,
        ipAddress: '1.1.1.1',
        userAgent: 'ua',
        cookieId: randomUUID(),
      })),
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-TEST-${randomUUID()}`,
        receiverName: 'Budi',
        receiverPhone: '08123456789',
        receiverEmail: 'b@example.com',
        receiverAddress: 'Addr',
        subtotal: 100000,
        shippingCost: 0,
        discount: 0,
        total: 100000,
        paymentMethod: 'BANK_TRANSFER',
        source: 'ONLINE',
        status: 'COMPLETED',
        affiliateUserId: user.id,
      },
    });
    createdOrderIds.push(order.id);
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        titleSnapshot: 'Produk Uji',
        priceSnapshot: 100000,
        discountPercentSnapshot: 0,
        quantity: 1,
        lineTotal: 100000,
      },
    });
    await prisma.affiliateConversion.create({
      data: {
        affiliateProfileId: profile.id,
        orderId: order.id,
        commissionAmount: 10000,
        status: 'APPROVED',
      },
    });
    await prisma.affiliateWithdrawal.create({
      data: {
        affiliateProfileId: profile.id,
        amount: 4000,
        bankName: 'BCA',
        bankAccount: '123',
        bankHolder: 'Holder',
      },
    });

    const response = await call(profile.id, cookie);
    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.totals).toMatchObject({
      clicks: 4,
      conversions: 1,
      completedOrders: 1,
      unitsSold: 1,
      salesValue: 100000,
      selectedProducts: 1,
    });
    expect(json.commission).toMatchObject({
      earnedTotal: 10000,
      available: 6000,
      withdrawalRequested: 4000,
    });
    expect(json.products).toHaveLength(1);
    expect(json.products[0]).toMatchObject({
      title: 'Produk Uji',
      clicks: 4,
      orders: 1,
      completedOrders: 1,
      salesValue: 100000,
      totalCommission: 10000,
    });
    expect(json.products[0]).toMatchObject({ isCustomCommission: false });
    expect(json.daily).toHaveLength(30);

    // Member-specific commission: validated, applied, and removable.
    const rateParams = { params: Promise.resolve({ id: profile.id, productId: product.id }) };
    const put = (body: unknown) =>
      PUT(
        new NextRequest('http://localhost/x', {
          method: 'PUT',
          headers: { cookie, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
        rateParams,
      );
    expect((await put({ commissionType: 'PERCENT', commissionValue: 101 })).status).toBe(400);
    expect((await put({ commissionType: 'FIXED', commissionValue: 1.5 })).status).toBe(400);
    expect((await put({ commissionType: 'FIXED', commissionValue: 2500 })).status).toBe(200);

    const custom = await (await call(profile.id, cookie)).json();
    expect(custom.products[0]).toMatchObject({
      isCustomCommission: true,
      commission: { type: 'FIXED', value: 2500 },
      baseCommission: { type: 'PERCENT', value: 10 },
      // The order was placed before the change, so it keeps the commission recorded back then.
      totalCommission: 10000,
    });

    const del = await DELETE(
      new NextRequest('http://localhost/x', { method: 'DELETE', headers: { cookie } }),
      rateParams,
    );
    expect(del.status).toBe(200);
    const reset = await (await call(profile.id, cookie)).json();
    expect(reset.products[0]).toMatchObject({ isCustomCommission: false, totalCommission: 10000 });
    expect(json.recentConversions[0].buyerName).toBe('Budi');
  });
});
