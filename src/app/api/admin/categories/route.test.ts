import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, POST } from '@/app/api/admin/categories/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
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

function buildRequest(body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function buildGetRequest(cookie: string) {
  return new NextRequest('http://localhost/api/admin/categories', {
    headers: { cookie },
  });
}

describe('POST /api/admin/categories', () => {
  afterAll(async () => {
    await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('rejects unauthenticated requests', async () => {
    const response = await POST(buildRequest({ name: 'Test' }, ''));
    expect(response.status).toBe(401);
  });

  it('creates a category with an auto-generated slug', async () => {
    const cookie = await createAdminCookie();
    const name = `Fiksi ${randomUUID()}`;

    const response = await POST(buildRequest({ name }, cookie));
    const json = await response.json();
    createdCategoryIds.push(json.id);

    expect(response.status).toBe(201);
    expect(json.slug).toContain('fiksi');
    expect(json.parentId).toBeNull();
  });

  it('rejects a duplicate name under the same parent', async () => {
    const cookie = await createAdminCookie();
    const name = `Non Fiksi ${randomUUID()}`;

    const first = await POST(buildRequest({ name }, cookie));
    const firstJson = await first.json();
    createdCategoryIds.push(firstJson.id);

    const response = await POST(buildRequest({ name }, cookie));

    expect(response.status).toBe(409);
  });
});

describe('GET /api/admin/categories', () => {
  afterAll(async () => {
    await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildGetRequest(''));
    expect(response.status).toBe(401);
  });

  it('returns categories as a tree including inactive ones', async () => {
    const cookie = await createAdminCookie();
    const name = `Anak ${randomUUID()}`;

    const created = await POST(buildRequest({ name, isActive: false }, cookie));
    const createdJson = await created.json();
    createdCategoryIds.push(createdJson.id);

    const response = await GET(buildGetRequest(cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    const found = json.categories.find((c: { id: string }) => c.id === createdJson.id);
    expect(found).toBeDefined();
    expect(found.isActive).toBe(false);
    expect(found.productCount).toBe(0);
    expect(found.children).toEqual([]);
  });
});
