import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, PUT } from '@/app/api/admin/settings/store/route';
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
  return new NextRequest('http://localhost/api/admin/settings/store', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function validPayload() {
  return {
    name: 'GenSa Berilmu',
    email: 'toko@example.com',
    phone: '08123456789',
    address: 'Jl. Contoh No. 1',
    defaultShippingCost: 15000,
    freeShippingMinTotal: 200000,
    bank1Name: 'BCA',
    bank1Number: '1234567890',
    bank1Holder: 'PT GenSa Berilmu',
    bank2Name: 'Mandiri',
    bank2Number: '0987654321',
    bank2Holder: 'PT GenSa Berilmu',
  };
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/settings/store', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''));
    expect(response.status).toBe(401);
  });

  it('returns setting, admin info, and storage stats', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.admin.email).toBeTruthy();
    expect(typeof json.storage.orderCount).toBe('number');
    expect(typeof json.canResetOrders).toBe('boolean');
  });
});

describe('PUT /api/admin/settings/store', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await PUT(buildRequest('PUT', {}, ''));
    expect(response.status).toBe(401);
  });

  it('rejects invalid email', async () => {
    const cookie = await createAdminCookie();
    const response = await PUT(
      buildRequest('PUT', { ...validPayload(), email: 'not-an-email' }, cookie),
    );
    expect(response.status).toBe(400);
  });

  it('saves the store setting', async () => {
    const cookie = await createAdminCookie();
    const response = await PUT(buildRequest('PUT', validPayload(), cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.setting.name).toBe('GenSa Berilmu');
    expect(json.setting.bank1Holder).toBe('PT GenSa Berilmu');
  });
});
