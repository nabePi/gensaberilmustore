import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/reports/revenue-by-category/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];
const createdCategoryIds: string[] = [];

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

async function createCategory(name: string) {
  const category = await prisma.category.create({
    data: { name, slug: `slug-${randomUUID()}` },
  });
  createdCategoryIds.push(category.id);
  return category;
}

async function createProduct(categoryId?: string) {
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
      ...(categoryId
        ? { categories: { create: { category: { connect: { id: categoryId } } } } }
        : {}),
    },
  });
  createdProductIds.push(product.id);
  return product;
}

async function createOrder(productId: string, lineTotal: number, quantity = 1) {
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-${randomUUID()}`,
      receiverName: 'Budi Santoso',
      receiverPhone: '08123456789',
      receiverEmail: 'budi@example.com',
      receiverAddress: 'Addr',
      receiverCity: 'City',
      subtotal: lineTotal,
      shippingCost: 0,
      discount: 0,
      total: lineTotal,
      paymentMethod: 'BANK_TRANSFER',
      source: 'ONLINE',
      status: 'PAID',
      items: {
        create: {
          productId,
          titleSnapshot: 'Snapshot',
          priceSnapshot: lineTotal,
          discountPercentSnapshot: 0,
          quantity,
          lineTotal,
        },
      },
    },
  });
  createdOrderIds.push(order.id);
  return order;
}

function buildRequest(cookie?: string, params?: Record<string, string>) {
  const url = new URL('http://localhost/api/admin/reports/revenue-by-category');
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url, {
    method: 'GET',
    headers: cookie ? { cookie } : undefined,
  });
}

describe('GET /api/admin/reports/revenue-by-category', () => {
  afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.categoryProduct.deleteMany({ where: { productId: { in: createdProductIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without an admin session', async () => {
    const response = await GET(buildRequest());
    expect(response.status).toBe(401);
  });

  it('returns revenue grouped by category sorted desc, uncategorized fallback included', async () => {
    const cookie = await createAdminCookie();
    const category = await createCategory(`Category ${randomUUID()}`);
    const categorized = await createProduct(category.id);
    const uncategorized = await createProduct();

    await createOrder(categorized.id, 50000);
    await createOrder(uncategorized.id, 10000);

    const response = await GET(buildRequest(cookie, { period: 'all_time' }));
    const json = await response.json();

    expect(response.status).toBe(200);
    const categorizedEntry = json.items.find(
      (item: { name: string }) => item.name === category.name,
    );
    expect(categorizedEntry.revenue).toBe(50000);
    const uncategorizedEntry = json.items.find(
      (item: { name: string }) => item.name === 'Tanpa Kategori',
    );
    expect(uncategorizedEntry.revenue).toBeGreaterThanOrEqual(10000);
    const sorted = [...json.items].sort(
      (a: { revenue: number }, b: { revenue: number }) => b.revenue - a.revenue,
    );
    expect(json.items).toEqual(sorted);
  });

  it('rejects an invalid period', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest(cookie, { period: 'bogus' }));
    expect(response.status).toBe(400);
  });
});
