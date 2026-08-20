import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, PUT } from '@/app/api/admin/config/kids/sections/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdSectionIds: string[] = [];

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

async function createProduct() {
  const product = await prisma.product.create({
    data: {
      sku: `SKU-${randomUUID()}`,
      slug: `slug-${randomUUID()}`,
      title: `Kids Section Product ${randomUUID()}`,
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
  return product;
}

function buildRequest(method: string, body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/admin/config/kids/sections', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

afterAll(async () => {
  await prisma.kidsSectionItem.deleteMany({
    where: {
      OR: [{ productId: { in: createdProductIds } }, { sectionId: { in: createdSectionIds } }],
    },
  });
  await prisma.kidsSection.deleteMany({ where: { id: { in: createdSectionIds } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/config/kids/sections', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''));
    expect(response.status).toBe(401);
  });

  it('returns sections list', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(json.sections)).toBe(true);
  });
});

describe('PUT /api/admin/config/kids/sections', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await PUT(buildRequest('PUT', { sections: [] }, ''));
    expect(response.status).toBe(401);
  });

  it('rejects an unknown product id', async () => {
    const cookie = await createAdminCookie();
    const response = await PUT(
      buildRequest('PUT', { sections: [{ title: 'Test', productIds: [randomUUID()] }] }, cookie),
    );
    expect(response.status).toBe(400);
  });

  it('creates a section with products', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();

    const existing = await prisma.kidsSection.findMany({ select: { id: true } });

    const response = await PUT(
      buildRequest(
        'PUT',
        {
          sections: [
            ...existing.map((s, i) => ({
              id: s.id,
              title: `Existing ${i}`,
              productIds: [],
            })),
            {
              title: 'Section Baru',
              subtitle: 'Subjudul',
              badge: 'Badge',
              theme: 'LAVENDER',
              showDiscountTag: true,
              productIds: [product.id],
            },
          ],
        },
        cookie,
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    const created = json.sections.find((s: { title: string }) => s.title === 'Section Baru');
    expect(created).toBeDefined();
    expect(created.productIds).toEqual([product.id]);
    expect(created.theme).toBe('LAVENDER');
    createdSectionIds.push(created.id);

    for (const s of existing) createdSectionIds.push(s.id);
  });

  it('deletes sections that are not included in the payload', async () => {
    const cookie = await createAdminCookie();

    const before = await prisma.kidsSection.findMany({ select: { id: true } });
    const keep = before[0];
    const dropped = before.slice(1);
    if (!keep) return;

    const response = await PUT(
      buildRequest(
        'PUT',
        { sections: [{ id: keep.id, title: 'Tetap Ada', productIds: [] }] },
        cookie,
      ),
    );
    expect(response.status).toBe(200);

    const remaining = await prisma.kidsSection.findMany({ select: { id: true } });
    expect(remaining.map((s) => s.id)).toEqual([keep.id]);
    for (const s of dropped) {
      expect(remaining.find((r) => r.id === s.id)).toBeUndefined();
    }

    // restore a second default section so the storefront keeps working
    const restored = await prisma.kidsSection.create({
      data: {
        title: 'Buku Diskon',
        subtitle: 'Dapatkan buku favorit si kecil dengan harga spesial, stok terbatas!',
        badge: 'Murah Meriah',
        theme: 'CORAL',
        showDiscountTag: true,
        position: 1,
      },
    });
    createdSectionIds.push(restored.id);
  });
});
