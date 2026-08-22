import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, PUT } from '@/app/api/admin/config/homepage/route';
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
  return new NextRequest('http://localhost/api/admin/config/homepage', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function validPayload() {
  return {
    banners: {
      HERO_MAIN: [
        { imageUrl: '/img/hero.jpg', linkUrl: 'https://example.com' },
        { imageUrl: '/img/hero-2.jpg', linkUrl: '' },
      ],
      HERO_SIDE_1: [{ imageUrl: '/img/side1.jpg', linkUrl: '' }],
      HERO_SIDE_2: [{ imageUrl: '/img/side2.jpg', linkUrl: '' }],
    },
  };
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/config/homepage', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''));
    expect(response.status).toBe(401);
  });

  it('returns banners grouped by slot', async () => {
    const cookie = await createAdminCookie();

    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.banners).toHaveProperty('HERO_MAIN');
    expect(json.banners).toHaveProperty('HERO_SIDE_1');
    expect(json.banners).toHaveProperty('HERO_SIDE_2');
  });
});

describe('PUT /api/admin/config/homepage', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await PUT(buildRequest('PUT', {}, ''));
    expect(response.status).toBe(401);
  });

  it('saves the homepage hero banners', async () => {
    const cookie = await createAdminCookie();

    const response = await PUT(buildRequest('PUT', validPayload(), cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.banners.HERO_MAIN).toHaveLength(2);
    expect(json.banners.HERO_MAIN[0].imageUrl).toBe('/img/hero.jpg');
    expect(json.banners.HERO_MAIN[0].linkUrl).toBe('https://example.com');
  });

  it('does not affect homepage sections when saving banners', async () => {
    const cookie = await createAdminCookie();
    const sectionKey = `test-section-${randomUUID()}`;
    const section = await prisma.homepageSection.create({
      data: {
        key: sectionKey,
        title: 'Section Uji',
        subtitle: 'Jangan terhapus',
        promoImageUrl: '',
        position: 999,
      },
    });

    try {
      const response = await PUT(buildRequest('PUT', validPayload(), cookie));
      expect(response.status).toBe(200);

      const persisted = await prisma.homepageSection.findUnique({ where: { id: section.id } });
      expect(persisted).not.toBeNull();
      expect(persisted?.key).toBe(sectionKey);
    } finally {
      await prisma.homepageSection.deleteMany({ where: { id: section.id } });
    }
  });
});
