import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, POST } from '@/app/api/admin/pos/transactions/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];
const createdVoucherCodes: string[] = [];

async function createAdminCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const admin = await prisma.user.create({
    data: { email, passwordHash, name: 'Admin', role: 'ADMIN' },
  });
  const { token } = await createSession({ userId: admin.id });
  return { cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}`, adminId: admin.id };
}

async function createProduct(
  overrides: Partial<Parameters<typeof prisma.product.create>[0]['data']> = {},
) {
  const product = await prisma.product.create({
    data: {
      sku: `SKU-${randomUUID()}`,
      slug: `slug-${randomUUID()}`,
      title: `Test Product ${randomUUID()}`,
      subtitle: '',
      author: 'Test Author',
      description: 'Desc',
      price: 50000,
      finalPrice: 50000,
      discountPercent: 0,
      stock: 10,
      weightGram: 100,
      pageCount: 100,
      coverType: 'SOFTCOVER',
      publishYear: 2024,
      isActive: true,
      ...overrides,
    },
  });
  createdProductIds.push(product.id);
  return product;
}

function buildRequest(
  method: string,
  body: unknown,
  cookie: string,
  url = 'http://localhost/api/admin/pos/transactions',
) {
  return new NextRequest(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

afterAll(async () => {
  await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
  await prisma.voucher.deleteMany({ where: { code: { in: createdVoucherCodes } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('POST /api/admin/pos/transactions', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await POST(buildRequest('POST', { items: [], paymentMethod: 'POS_CASH' }, ''));
    expect(response.status).toBe(401);
  });

  it('creates a POS order, decrements stock, and returns order number', async () => {
    const { cookie, adminId } = await createAdminCookie();
    const product = await createProduct({ stock: 5 });

    const response = await POST(
      buildRequest(
        'POST',
        {
          items: [{ productId: product.id, quantity: 2 }],
          paymentMethod: 'POS_CASH',
          customerName: 'Budi',
        },
        cookie,
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    createdOrderIds.push(json.orderId);

    const order = await prisma.order.findUnique({ where: { id: json.orderId } });
    expect(order?.source).toBe('POS');
    expect(order?.status).toBe('PAID');
    expect(order?.posCashierUserId).toBe(adminId);
    expect(order?.total).toBe(100000);

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct?.stock).toBe(3);
  });

  it('applies manual discount to the total', async () => {
    const { cookie } = await createAdminCookie();
    const product = await createProduct({ price: 100000, finalPrice: 100000, stock: 5 });

    const response = await POST(
      buildRequest(
        'POST',
        {
          items: [{ productId: product.id, quantity: 1 }],
          paymentMethod: 'POS_CASH',
          manualDiscount: 20000,
          manualDiscountReason: 'Diskon pameran',
        },
        cookie,
      ),
    );
    const json = await response.json();
    expect(response.status).toBe(201);
    createdOrderIds.push(json.orderId);

    const order = await prisma.order.findUnique({ where: { id: json.orderId } });
    expect(order?.total).toBe(80000);
    expect(order?.manualDiscount).toBe(20000);
  });

  it('rejects when stock is insufficient', async () => {
    const { cookie } = await createAdminCookie();
    const product = await createProduct({ stock: 1 });

    const response = await POST(
      buildRequest(
        'POST',
        { items: [{ productId: product.id, quantity: 5 }], paymentMethod: 'POS_CASH' },
        cookie,
      ),
    );

    expect(response.status).toBe(400);
  });

  it('applies a valid POS voucher discount', async () => {
    const { cookie, adminId } = await createAdminCookie();
    const product = await createProduct({ price: 100000, finalPrice: 100000, stock: 5 });
    const code = `POSV-${randomUUID()}`.toUpperCase();
    createdVoucherCodes.push(code);
    await prisma.voucher.create({
      data: {
        code,
        type: 'FIXED',
        value: 10000,
        channel: 'POS',
        minPurchase: 0,
        isActive: true,
        createdByUserId: adminId,
      },
    });

    const response = await POST(
      buildRequest(
        'POST',
        {
          items: [{ productId: product.id, quantity: 1 }],
          paymentMethod: 'POS_QRIS',
          voucherCode: code,
        },
        cookie,
      ),
    );
    const json = await response.json();
    expect(response.status).toBe(201);
    createdOrderIds.push(json.orderId);

    const order = await prisma.order.findUnique({ where: { id: json.orderId } });
    expect(order?.voucherDiscount).toBe(10000);
    expect(order?.total).toBe(90000);
  });
});

describe('GET /api/admin/pos/transactions', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''));
    expect(response.status).toBe(401);
  });

  it('lists only POS orders', async () => {
    const { cookie } = await createAdminCookie();
    const product = await createProduct({ stock: 5 });

    const created = await POST(
      buildRequest(
        'POST',
        { items: [{ productId: product.id, quantity: 1 }], paymentMethod: 'POS_CASH' },
        cookie,
      ),
    );
    const createdJson = await created.json();
    createdOrderIds.push(createdJson.orderId);

    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items.some((item: { id: string }) => item.id === createdJson.orderId)).toBe(true);
  });
});
