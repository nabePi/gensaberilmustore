import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/affiliates/[id]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdOrderIds: string[] = [];
const createdProductIds: string[] = [];

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

function buildRequest(id: string, cookie: string) {
  return new NextRequest(`http://localhost/api/admin/affiliates/${id}`, {
    method: 'GET',
    headers: { cookie },
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterAll(async () => {
  await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/affiliates/[id]', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest(randomUUID(), ''), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a non-existent affiliate', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest(randomUUID(), cookie), context(randomUUID()));
    expect(response.status).toBe(404);
  });

  it('returns affiliate detail with conversion history and commission breakdown', async () => {
    const cookie = await createAdminCookie();
    const email = `affiliate-${randomUUID()}@example.com`;
    createdEmails.push(email);
    const passwordHash = await hashPassword('Password123');
    const affiliateUser = await prisma.user.create({
      data: { email, passwordHash, name: 'Affiliate Test', role: 'AFFILIATE' },
    });
    const profile = await prisma.affiliateProfile.create({
      data: {
        userId: affiliateUser.id,
        code: `AFF-${randomUUID()}`,
        payoutBankName: 'Bank',
        payoutBankAccount: '123',
        payoutBankHolder: 'Affiliate Test',
      },
    });

    const product = await prisma.product.create({
      data: {
        sku: `SKU-${randomUUID()}`,
        slug: `slug-${randomUUID()}`,
        title: 'Product for affiliate',
        subtitle: '',
        author: 'Author',
        description: 'Desc',
        price: 100000,
        finalPrice: 100000,
        stock: 5,
        weightGram: 100,
        pageCount: 100,
        coverType: 'SOFTCOVER',
        publishYear: 2024,
        isActive: true,
      },
    });
    createdProductIds.push(product.id);

    await prisma.affiliateProductSelection.create({
      data: { affiliateProfileId: profile.id, productId: product.id },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${randomUUID()}`,
        receiverName: 'Buyer',
        receiverPhone: '08123',
        receiverEmail: 'buyer@example.com',
        receiverAddress: 'Address',
        receiverCity: 'City',
        subtotal: 100000,
        shippingCost: 10000,
        discount: 0,
        total: 110000,
        paymentMethod: 'BANK_TRANSFER',
        source: 'ONLINE',
        status: 'PAID',
        affiliateUserId: affiliateUser.id,
        affiliateCode: profile.code,
      },
    });
    createdOrderIds.push(order.id);

    await prisma.affiliateConversion.create({
      data: {
        affiliateProfileId: profile.id,
        orderId: order.id,
        commissionAmount: 10000,
        status: 'APPROVED',
      },
    });

    const response = await GET(buildRequest(profile.id, cookie), context(profile.id));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.id).toBe(profile.id);
    expect(json.products).toHaveLength(1);
    expect(json.conversions).toHaveLength(1);
    expect(json.commissionByStatus.APPROVED).toBe(10000);
  });
});
