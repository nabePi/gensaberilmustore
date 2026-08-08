import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, POST } from '@/app/api/member/receivers/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession, SESSION_COOKIE_NAME } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdUserIds: string[] = [];
const createdCityIds: string[] = [];

async function createMemberCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const user = await prisma.user.create({
    data: { email, passwordHash, name: 'Member', role: 'BUYER' },
  });
  createdUserIds.push(user.id);
  const { token } = await createSession({ userId: user.id });
  return { cookie: `${SESSION_COOKIE_NAME}=${token}`, user };
}

async function createCity() {
  const city = await prisma.city.create({
    data: {
      name: `Test City ${randomUUID()}`,
      province: 'Test Province',
      shippingCost: 20000,
      isActive: true,
    },
  });
  createdCityIds.push(city.id);
  return city;
}

function buildRequest(method: string, body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/member/receivers', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

afterAll(async () => {
  await prisma.receiver.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.city.deleteMany({ where: { id: { in: createdCityIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/member/receivers', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''));
    expect(response.status).toBe(401);
  });

  it('lists receivers ordered by isDefault desc, updatedAt desc', async () => {
    const { cookie, user } = await createMemberCookie();
    const city = await createCity();

    const first = await prisma.receiver.create({
      data: {
        userId: user.id,
        label: 'Rumah',
        name: 'A',
        phone: '08111',
        address: 'Addr 1',
        cityId: city.id,
        isDefault: false,
      },
    });
    const second = await prisma.receiver.create({
      data: {
        userId: user.id,
        label: 'Kantor',
        name: 'B',
        phone: '08222',
        address: 'Addr 2',
        cityId: city.id,
        isDefault: true,
      },
    });

    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(2);
    expect(json.items[0].id).toBe(second.id);
    expect(json.items[0].city.name).toBe(city.name);
    expect(json.items[0].city.shippingCost).toBe(city.shippingCost);
    expect(json.items[1].id).toBe(first.id);
  });

  it('only returns receivers belonging to the authenticated user', async () => {
    const { cookie } = await createMemberCookie();
    const { user: otherUser } = await createMemberCookie();
    const city = await createCity();

    await prisma.receiver.create({
      data: {
        userId: otherUser.id,
        label: 'Rumah',
        name: 'Other',
        phone: '08333',
        address: 'Addr',
        cityId: city.id,
      },
    });

    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(0);
  });
});

describe('POST /api/member/receivers', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await POST(buildRequest('POST', {}, ''));
    expect(response.status).toBe(401);
  });

  it('rejects an invalid payload', async () => {
    const { cookie } = await createMemberCookie();
    const response = await POST(buildRequest('POST', { label: '' }, cookie));
    expect(response.status).toBe(400);
  });

  it('rejects a non-existent city', async () => {
    const { cookie } = await createMemberCookie();
    const response = await POST(
      buildRequest(
        'POST',
        { label: 'Rumah', name: 'A', phone: '08111', address: 'Addr', cityId: randomUUID() },
        cookie,
      ),
    );
    expect(response.status).toBe(400);
  });

  it('creates a receiver', async () => {
    const { cookie, user } = await createMemberCookie();
    const city = await createCity();

    const response = await POST(
      buildRequest(
        'POST',
        { label: 'Rumah', name: 'A', phone: '08111', address: 'Addr', cityId: city.id },
        cookie,
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.userId).toBe(user.id);
    expect(json.isDefault).toBe(false);
    expect(json.city.name).toBe(city.name);
  });

  it('unsets other receivers as default when isDefault=true', async () => {
    const { cookie, user } = await createMemberCookie();
    const city = await createCity();

    const existing = await prisma.receiver.create({
      data: {
        userId: user.id,
        label: 'Rumah',
        name: 'A',
        phone: '08111',
        address: 'Addr',
        cityId: city.id,
        isDefault: true,
      },
    });

    const response = await POST(
      buildRequest(
        'POST',
        {
          label: 'Kantor',
          name: 'B',
          phone: '08222',
          address: 'Addr 2',
          cityId: city.id,
          isDefault: true,
        },
        cookie,
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.isDefault).toBe(true);

    const updatedExisting = await prisma.receiver.findUnique({ where: { id: existing.id } });
    expect(updatedExisting?.isDefault).toBe(false);
  });
});
