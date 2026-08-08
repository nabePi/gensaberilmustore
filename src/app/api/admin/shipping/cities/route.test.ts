import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/admin/shipping/cities/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdCityIds: string[] = [];

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

function buildRequest(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/admin/shipping/cities', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

describe('POST /api/admin/shipping/cities', () => {
  afterAll(async () => {
    await prisma.city.deleteMany({ where: { id: { in: createdCityIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without an admin session', async () => {
    const response = await POST(
      buildRequest({ name: 'City', province: 'Province', shippingCost: 10000 }),
    );
    expect(response.status).toBe(401);
  });

  it('rejects an invalid payload', async () => {
    const cookie = await createAdminCookie();
    const response = await POST(buildRequest({ name: '' }, cookie));
    expect(response.status).toBe(400);
  });

  it('creates a city', async () => {
    const cookie = await createAdminCookie();
    const response = await POST(
      buildRequest(
        { name: `Test City ${randomUUID()}`, province: 'Test Province', shippingCost: 15000 },
        cookie,
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.shippingCost).toBe(15000);
    expect(json.isActive).toBe(true);
    createdCityIds.push(json.id);
  });
});
