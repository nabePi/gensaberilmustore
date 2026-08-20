import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, PUT } from '@/app/api/admin/config/kids/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];

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

function buildRequest(method: string, body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/admin/config/kids', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function validPayload(banners: { imageUrl: string; linkUrl?: string }[] = []) {
  return {
    heroBadge: 'Buku Anak',
    heroTitle: 'Dunia Buku Anak',
    heroDescription: 'Koleksi buku anak terbaik',
    heroImageUrl: '/img/kids-hero.jpg',
    promoBadge: 'Promo',
    promoTitle: 'Diskon Spesial',
    promoDescription: 'Diskon untuk buku anak pilihan',
    promoImageUrl: '/img/kids-promo.jpg',
    banners,
  };
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/config/kids', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''));
    expect(response.status).toBe(401);
  });

  it('returns config and banners', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty('config');
    expect(json).toHaveProperty('banners');
    expect(Array.isArray(json.banners)).toBe(true);
  });
});

describe('PUT /api/admin/config/kids', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await PUT(buildRequest('PUT', {}, ''));
    expect(response.status).toBe(401);
  });

  it('saves the config without banners', async () => {
    const cookie = await createAdminCookie();

    const response = await PUT(buildRequest('PUT', validPayload(), cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.config.heroTitle).toBe('Dunia Buku Anak');
    expect(json.banners).toEqual([]);
  });

  it('saves multiple banners with optional link urls and positions', async () => {
    const cookie = await createAdminCookie();

    const payload = validPayload([
      { imageUrl: '/uploads/banner-1.png', linkUrl: 'https://example.com/promo' },
      { imageUrl: '/uploads/banner-2.png' },
      { imageUrl: '/uploads/banner-3.png', linkUrl: '' },
    ]);

    const response = await PUT(buildRequest('PUT', payload, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.banners).toHaveLength(3);
    expect(json.banners[0].linkUrl).toBe('https://example.com/promo');
    expect(json.banners[1].linkUrl).toBeNull();
    expect(json.banners[2].linkUrl).toBeNull();
    expect(json.banners.map((b: { position: number }) => b.position)).toEqual([0, 1, 2]);
  });

  it('replaces banners on subsequent saves', async () => {
    const cookie = await createAdminCookie();

    await PUT(buildRequest('PUT', validPayload([{ imageUrl: '/uploads/old.png' }]), cookie));
    const response = await PUT(
      buildRequest('PUT', validPayload([{ imageUrl: '/uploads/new.png' }]), cookie),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.banners).toHaveLength(1);
    expect(json.banners[0].imageUrl).toBe('/uploads/new.png');
  });

  it('rejects invalid banner link urls', async () => {
    const cookie = await createAdminCookie();

    const response = await PUT(
      buildRequest(
        'PUT',
        validPayload([{ imageUrl: '/uploads/x.png', linkUrl: 'not-a-url' }]),
        cookie,
      ),
    );
    expect(response.status).toBe(400);
  });
});
