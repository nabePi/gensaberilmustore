import { createHash, randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/auth/admin/login/route';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/server/auth/password';

const TEST_PASSWORD = 'Password123';
const createdEmails: string[] = [];

async function createTestUser(role: 'BUYER' | 'ADMIN' = 'ADMIN') {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword(TEST_PASSWORD);
  return prisma.user.create({
    data: { email, passwordHash, name: 'Test Admin', role },
  });
}

function buildRequest(body: unknown, ip = `10.2.2.${Math.floor(Math.random() * 100000)}`) {
  return new NextRequest('http://localhost/api/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  });
}

describe('POST /api/auth/admin/login', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('logs in an admin with valid credentials', async () => {
    const admin = await createTestUser('ADMIN');

    const response = await POST(buildRequest({ email: admin.email, password: TEST_PASSWORD }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.user.role).toBe('ADMIN');
    expect(response.cookies.get('admin_session')?.value).toBeTruthy();
  });

  it('rejects a non-admin user with a generic 401', async () => {
    const buyer = await createTestUser('BUYER');

    const response = await POST(buildRequest({ email: buyer.email, password: TEST_PASSWORD }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Email atau password salah');
  });

  it('rejects a wrong password with a generic 401', async () => {
    const admin = await createTestUser('ADMIN');

    const response = await POST(buildRequest({ email: admin.email, password: 'WrongPass123' }));

    expect(response.status).toBe(401);
  });

  it('logs in a legacy admin with an MD5 password and upgrades it to bcrypt', async () => {
    const email = `test-${randomUUID()}@example.com`;
    createdEmails.push(email);
    const passwordmd5 = createHash('md5').update(TEST_PASSWORD).digest('hex');
    await prisma.user.create({
      data: { email, passwordmd5, passwordHash: null, name: 'Legacy Admin', role: 'ADMIN' },
    });

    const response = await POST(buildRequest({ email, password: TEST_PASSWORD }));

    expect(response.status).toBe(200);

    const updated = await prisma.user.findUnique({ where: { email } });
    expect(updated?.passwordmd5).toBeNull();
    expect(await verifyPassword(TEST_PASSWORD, updated!.passwordHash!)).toBe(true);
  });

  it('rate limits after 5 attempts from the same IP', async () => {
    const ip = `10.3.3.${Math.floor(Math.random() * 100000)}`;
    const email = `nobody-${randomUUID()}@example.com`;

    let lastResponse;
    for (let i = 0; i < 5; i += 1) {
      lastResponse = await POST(buildRequest({ email, password: 'WrongPass123' }, ip));
    }
    expect(lastResponse?.status).toBe(401);

    const blocked = await POST(buildRequest({ email, password: 'WrongPass123' }, ip));
    expect(blocked.status).toBe(429);
  }, 15000);
});
