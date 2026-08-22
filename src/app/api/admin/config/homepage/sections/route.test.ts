import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, PUT } from '@/app/api/admin/config/homepage/sections/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
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

async function createProduct() {
  const product = await prisma.product.create({
    data: {
      sku: `SKU-${randomUUID()}`,
      slug: `slug-${randomUUID()}`,
      title: `Homepage Product ${randomUUID()}`,
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
  return new NextRequest('http://localhost/api/admin/config/homepage/sections', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function validPayload(productId: string) {
  return {
    sections: [
      {
        key: 'newest',
        title: 'Buku Terbaru',
        subtitle: 'Rilisan terbaru',
        promoImageUrl: 'https://example.com/img/promo1.jpg',
        position: 0,
        productIds: [productId],
      },
    ],
  };
}

async function cleanupTestSections() {
  await prisma.homepageSectionProduct.deleteMany({});
  await prisma.homepageSection.deleteMany({});
}

afterAll(async () => {
  await cleanupTestSections();
  await prisma.homepageSectionProduct.deleteMany({
    where: { productId: { in: createdProductIds } },
  });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/config/homepage/sections', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''));
    expect(response.status).toBe(401);
  });

  it('returns dynamic sections array', async () => {
    const cookie = await createAdminCookie();
    await cleanupTestSections();
    await prisma.homepageSection.create({
      data: {
        key: 'test-newest',
        title: 'Buku Terbaru',
        subtitle: 'Rilisan terbaru',
        promoImageUrl: '',
        position: 0,
      },
    });

    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(json.sections)).toBe(true);
    expect(json.sections[0].key).toBe('test-newest');
  });
});

describe('PUT /api/admin/config/homepage/sections', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await PUT(buildRequest('PUT', {}, ''));
    expect(response.status).toBe(401);
  });

  it('rejects an unknown product id in a section', async () => {
    const cookie = await createAdminCookie();
    const response = await PUT(buildRequest('PUT', validPayload(randomUUID()), cookie));
    expect(response.status).toBe(400);
  });

  it('saves the dynamic sections with curated products', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();
    await cleanupTestSections();

    const response = await PUT(buildRequest('PUT', validPayload(product.id), cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.sections).toHaveLength(1);
    expect(json.sections[0].key).toBe('newest');
    expect(json.sections[0].productIds).toEqual([product.id]);
  });

  it('does not affect homepage banners when saving sections', async () => {
    const cookie = await createAdminCookie();
    const banner = await prisma.homepageBanner.create({
      data: {
        slot: 'HERO_MAIN',
        imageUrl: `/img/test-${randomUUID()}.jpg`,
        position: 999,
      },
    });

    try {
      const response = await PUT(buildRequest('PUT', { sections: [] }, cookie));
      expect(response.status).toBe(200);

      const persisted = await prisma.homepageBanner.findUnique({ where: { id: banner.id } });
      expect(persisted).not.toBeNull();
    } finally {
      await prisma.homepageBanner.deleteMany({ where: { id: banner.id } });
    }
  });
});
