import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET as GET_DETAIL, PUT, DELETE } from '@/app/api/admin/blog/[id]/route';
import { GET, POST } from '@/app/api/admin/blog/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdPostIds: string[] = [];

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
  return new NextRequest('http://localhost/api/admin/blog', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function buildListRequest(cookie: string, query = '') {
  return new NextRequest(`http://localhost/api/admin/blog${query}`, {
    headers: { cookie },
  });
}

function buildDetailRequest(body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/admin/blog/x', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function detailContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validPayload = () => ({
  title: `Artikel ${randomUUID()}`,
  excerpt: 'Ringkasan artikel uji.',
  contentHtml: '<p>Konten artikel uji.</p>',
  author: 'Redaksi',
  tags: ['Tips'],
  status: 'DRAFT',
});

afterAll(async () => {
  await prisma.blogPost.deleteMany({ where: { id: { in: createdPostIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('POST /api/admin/blog', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await POST(buildRequest(validPayload(), ''));
    expect(response.status).toBe(401);
  });

  it('creates a draft post with an auto-generated slug', async () => {
    const cookie = await createAdminCookie();
    const payload = validPayload();

    const response = await POST(buildRequest(payload, cookie));
    const json = await response.json();
    createdPostIds.push(json.id);

    expect(response.status).toBe(201);
    expect(json.slug).toContain('artikel');
    expect(json.status).toBe('DRAFT');
    expect(json.publishedAt).toBeNull();
  });

  it('sets publishedAt when created as published', async () => {
    const cookie = await createAdminCookie();

    const response = await POST(buildRequest({ ...validPayload(), status: 'PUBLISHED' }, cookie));
    const json = await response.json();
    createdPostIds.push(json.id);

    expect(response.status).toBe(201);
    expect(json.status).toBe('PUBLISHED');
    expect(json.publishedAt).not.toBeNull();
  });

  it('rejects a duplicate slug', async () => {
    const cookie = await createAdminCookie();
    const slug = `slug-${randomUUID()}`;

    const first = await POST(buildRequest({ ...validPayload(), slug }, cookie));
    const firstJson = await first.json();
    createdPostIds.push(firstJson.id);

    const response = await POST(buildRequest({ ...validPayload(), slug }, cookie));
    expect(response.status).toBe(409);
  });

  it('rejects invalid payloads', async () => {
    const cookie = await createAdminCookie();
    const response = await POST(buildRequest({ title: '' }, cookie));
    expect(response.status).toBe(400);
  });
});

describe('GET /api/admin/blog', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildListRequest(''));
    expect(response.status).toBe(401);
  });

  it('lists posts and supports status filter', async () => {
    const cookie = await createAdminCookie();

    const created = await POST(buildRequest({ ...validPayload(), status: 'DRAFT' }, cookie));
    const createdJson = await created.json();
    createdPostIds.push(createdJson.id);

    const response = await GET(buildListRequest(cookie, '?status=DRAFT&q=Artikel'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(json.items)).toBe(true);
    const found = json.items.find((item: { id: string }) => item.id === createdJson.id);
    expect(found).toBeDefined();
    expect(found.status).toBe('DRAFT');
  });
});

describe('PUT /api/admin/blog/[id]', () => {
  it('returns 404 for unknown id', async () => {
    const cookie = await createAdminCookie();
    const response = await PUT(
      buildDetailRequest({ title: 'Baru' }, cookie),
      detailContext(randomUUID()),
    );
    expect(response.status).toBe(404);
  });

  it('publishes a draft and sets publishedAt', async () => {
    const cookie = await createAdminCookie();

    const created = await POST(buildRequest(validPayload(), cookie));
    const createdJson = await created.json();
    createdPostIds.push(createdJson.id);

    const response = await PUT(
      buildDetailRequest({ status: 'PUBLISHED' }, cookie),
      detailContext(createdJson.id),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('PUBLISHED');
    expect(json.publishedAt).not.toBeNull();
  });

  it('updates fields', async () => {
    const cookie = await createAdminCookie();

    const created = await POST(buildRequest(validPayload(), cookie));
    const createdJson = await created.json();
    createdPostIds.push(createdJson.id);

    const response = await PUT(
      buildDetailRequest({ title: 'Judul Baru', tags: ['Renungan', 'Umat'] }, cookie),
      detailContext(createdJson.id),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.title).toBe('Judul Baru');
    expect(json.tags).toEqual(['Renungan', 'Umat']);
  });
});

describe('GET & DELETE /api/admin/blog/[id]', () => {
  it('gets a single post', async () => {
    const cookie = await createAdminCookie();

    const created = await POST(buildRequest(validPayload(), cookie));
    const createdJson = await created.json();
    createdPostIds.push(createdJson.id);

    const request = new NextRequest('http://localhost/api/admin/blog/x', {
      headers: { cookie },
    });
    const response = await GET_DETAIL(request, detailContext(createdJson.id));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.id).toBe(createdJson.id);
  });

  it('deletes a post', async () => {
    const cookie = await createAdminCookie();

    const created = await POST(buildRequest(validPayload(), cookie));
    const createdJson = await created.json();

    const request = new NextRequest('http://localhost/api/admin/blog/x', {
      method: 'DELETE',
      headers: { cookie },
    });
    const response = await DELETE(request, detailContext(createdJson.id));
    expect(response.status).toBe(204);

    const check = await GET_DETAIL(request, detailContext(createdJson.id));
    expect(check.status).toBe(404);
  });
});
