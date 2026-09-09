import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, POST, PUT } from '@/app/api/admin/config/homepage/sections/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
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

function buildRequest(method: string, body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/admin/config/homepage/sections', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

async function createSection(
  overrides: Partial<{ key: string; title: string; position: number }> = {},
) {
  const section = await prisma.homepageSection.create({
    data: {
      key: overrides.key ?? `test-${randomUUID()}`,
      title: overrides.title ?? 'Buku Terbaru',
      subtitle: '',
      promoImageUrl: '',
      position: overrides.position ?? 0,
    },
  });
  createdSectionIds.push(section.id);
  return section;
}

// Other test files (e.g. sections/[id]/route.test.ts) create HomepageSection rows in this
// same shared table. The PUT route deletes any section not present in the incoming list, so
// tests must echo back every currently-existing section they don't intend to delete, instead
// of wiping/replacing the whole table - otherwise concurrently-running test files race and
// their rows get collaterally deleted.
async function listAllSectionsAsPayload(excludeId?: string) {
  const sections = await prisma.homepageSection.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
  });
  return sections.map((s) => ({
    id: s.id,
    key: s.key,
    title: s.title,
    position: s.position,
    isEnabled: s.isEnabled,
  }));
}

afterAll(async () => {
  await prisma.homepageSection.deleteMany({ where: { id: { in: createdSectionIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/config/homepage/sections', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''));
    expect(response.status).toBe(401);
  });

  it('returns dynamic sections array', async () => {
    const cookie = await createAdminCookie();
    const section = await createSection({ key: `test-newest-${randomUUID()}` });

    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(json.sections)).toBe(true);
    expect(json.sections.some((s: { key: string }) => s.key === section.key)).toBe(true);
  });
});

describe('PUT /api/admin/config/homepage/sections', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await PUT(buildRequest('PUT', {}, ''));
    expect(response.status).toBe(401);
  });

  it('renames, reorders, and toggles sections without touching product curation', async () => {
    const cookie = await createAdminCookie();
    const section = await createSection({ key: `newest-${randomUUID()}`, title: 'Buku Terbaru' });
    const others = await listAllSectionsAsPayload(section.id);

    const response = await PUT(
      buildRequest(
        'PUT',
        {
          sections: [
            ...others,
            {
              id: section.id,
              key: `newest-renamed-${randomUUID()}`,
              title: 'Buku Terbaru Renamed',
              position: 0,
              isEnabled: false,
            },
          ],
        },
        cookie,
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    const renamed = json.sections.find((s: { id: string }) => s.id === section.id);
    expect(renamed?.isEnabled).toBe(false);

    const persisted = await prisma.homepageSection.findUnique({ where: { id: section.id } });
    expect(persisted?.title).toBe('Buku Terbaru Renamed');
  });

  it('deletes sections missing from the incoming list', async () => {
    const cookie = await createAdminCookie();
    const section = await createSection();
    const others = await listAllSectionsAsPayload(section.id);

    const response = await PUT(buildRequest('PUT', { sections: others }, cookie));
    expect(response.status).toBe(200);

    const remaining = await prisma.homepageSection.findUnique({ where: { id: section.id } });
    expect(remaining).toBeNull();
    createdSectionIds.splice(createdSectionIds.indexOf(section.id), 1);
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
      const others = await listAllSectionsAsPayload();
      const response = await PUT(buildRequest('PUT', { sections: others }, cookie));
      expect(response.status).toBe(200);

      const persisted = await prisma.homepageBanner.findUnique({ where: { id: banner.id } });
      expect(persisted).not.toBeNull();
    } finally {
      await prisma.homepageBanner.deleteMany({ where: { id: banner.id } });
    }
  });
});

describe('POST /api/admin/config/homepage/sections', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await POST(buildRequest('POST', {}, ''));
    expect(response.status).toBe(401);
  });

  it('creates a disabled draft section', async () => {
    const cookie = await createAdminCookie();
    const key = `draft-${randomUUID()}`;

    const response = await POST(buildRequest('POST', { title: 'Draft Section', key }, cookie));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.id).toBeDefined();

    const persisted = await prisma.homepageSection.findUnique({ where: { id: json.id } });
    expect(persisted?.isEnabled).toBe(false);
    expect(persisted?.type).toBe('REGULAR');
  });

  it('rejects a duplicate key', async () => {
    const cookie = await createAdminCookie();
    const key = `dup-${randomUUID()}`;
    await createSection({ key });

    const response = await POST(buildRequest('POST', { title: 'Dup', key }, cookie));
    expect(response.status).toBe(400);
  });
});
