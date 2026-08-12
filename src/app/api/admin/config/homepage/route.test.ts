import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, PUT } from '@/app/api/admin/config/homepage/route';
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
  return new NextRequest('http://localhost/api/admin/config/homepage', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function validPayload(productId: string) {
  return {
    banners: {
      HERO_MAIN: [
        { imageUrl: '/img/hero.jpg', linkUrl: 'https://example.com' },
        { imageUrl: '/img/hero-2.jpg', linkUrl: '' },
      ],
      HERO_SIDE_1: [{ imageUrl: '/img/side1.jpg', linkUrl: '' }],
      HERO_SIDE_2: [{ imageUrl: '/img/side2.jpg', linkUrl: '' }],
    },
    sectionNewestPromoImageUrl: '/img/promo1.jpg',
    sectionBestsellerPromoImageUrl: '/img/promo2.jpg',
    sectionInternationalPromoImageUrl: '/img/promo3.jpg',
    sectionKiwariPromoImageUrl: '/img/promo4.jpg',
    sectionKlasikPromoImageUrl: '/img/promo5.jpg',
    sections: {
      NEWEST: [productId],
      BESTSELLER: [],
      INTERNATIONAL: [],
      KIWARI: [],
      KLASIK: [],
      OTHERS: [],
    },
  };
}

afterAll(async () => {
  await prisma.homepageSectionProduct.deleteMany({
    where: { productId: { in: createdProductIds } },
  });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/config/homepage', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''));
    expect(response.status).toBe(401);
  });

  it('returns config and section product ids', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.sections).toHaveProperty('NEWEST');
    expect(json.sections).toHaveProperty('OTHERS');
  });
});

describe('PUT /api/admin/config/homepage', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await PUT(buildRequest('PUT', {}, ''));
    expect(response.status).toBe(401);
  });

  it('rejects an unknown product id in a section', async () => {
    const cookie = await createAdminCookie();
    const response = await PUT(buildRequest('PUT', validPayload(randomUUID()), cookie));
    expect(response.status).toBe(400);
  });

  it('saves the config, banners, and section products', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();

    const response = await PUT(buildRequest('PUT', validPayload(product.id), cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.banners.HERO_MAIN).toHaveLength(2);
    expect(json.banners.HERO_MAIN[0].imageUrl).toBe('/img/hero.jpg');
    expect(json.banners.HERO_MAIN[0].linkUrl).toBe('https://example.com');
    expect(json.sections.NEWEST).toEqual([product.id]);
  });
});
