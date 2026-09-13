import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { DELETE, PUT } from '@/app/api/admin/shipping/cities/[id]/route';
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

async function createCity(
  overrides: Partial<Parameters<typeof prisma.city.create>[0]['data']> = {},
) {
  const city = await prisma.city.create({
    data: {
      name: `Test City ${randomUUID()}`,
      province: 'Test Province',
      shippingCost: 20000,
      isActive: true,
      ...overrides,
    },
  });
  createdCityIds.push(city.id);
  return city;
}

function buildRequest(method: string, body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/admin/shipping/cities/x', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterAll(async () => {
  await prisma.city.deleteMany({ where: { id: { in: createdCityIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('PUT /api/admin/shipping/cities/[id]', () => {
  it('returns 404 for a non-existent city', async () => {
    const cookie = await createAdminCookie();
    const response = await PUT(
      buildRequest('PUT', { shippingCost: 5000 }, cookie),
      context(randomUUID()),
    );
    expect(response.status).toBe(404);
  });

  it('updates the shipping cost', async () => {
    const cookie = await createAdminCookie();
    const city = await createCity();

    const response = await PUT(
      buildRequest('PUT', { shippingCost: 25000 }, cookie),
      context(city.id),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.shippingCost).toBe(25000);
    expect(json.name).toBe(city.name);
  });
});

describe('DELETE /api/admin/shipping/cities/[id]', () => {
  it('deletes a city', async () => {
    const cookie = await createAdminCookie();
    const city = await createCity();

    const response = await DELETE(buildRequest('DELETE', undefined, cookie), context(city.id));
    expect(response.status).toBe(204);
    createdCityIds.splice(createdCityIds.indexOf(city.id), 1);
  });
});
