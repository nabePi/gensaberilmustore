import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/auth/login/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';

const TEST_PASSWORD = 'Password123';
const createdEmails: string[] = [];

async function createTestUser(role: 'BUYER' | 'ADMIN' = 'BUYER') {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword(TEST_PASSWORD);
  return prisma.user.create({
    data: { email, passwordHash, name: 'Test User', role },
  });
}

function buildRequest(body: unknown, ip = `10.0.0.${Math.floor(Math.random() * 100000)}`) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  });
}

describe('POST /api/auth/login', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('logs in with valid credentials', async () => {
    const user = await createTestUser();

    const response = await POST(buildRequest({ email: user.email, password: TEST_PASSWORD }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.user.email).toBe(user.email);
    expect(typeof json.token).toBe('string');
    expect(response.cookies.get('session')?.value).toBeTruthy();
  });

  it('rejects wrong password with a generic 401', async () => {
    const user = await createTestUser();

    const response = await POST(buildRequest({ email: user.email, password: 'WrongPass123' }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Email atau password salah');
  });

  it('rejects unknown email with the same generic 401', async () => {
    const response = await POST(
      buildRequest({ email: `nobody-${randomUUID()}@example.com`, password: TEST_PASSWORD }),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Email atau password salah');
  });

  it('rejects admin accounts', async () => {
    const admin = await createTestUser('ADMIN');

    const response = await POST(buildRequest({ email: admin.email, password: TEST_PASSWORD }));

    expect(response.status).toBe(401);
  });

  it('sets a longer-lived cookie when remember is true', async () => {
    const user = await createTestUser();

    const response = await POST(
      buildRequest({ email: user.email, password: TEST_PASSWORD, remember: true }),
    );
    const cookie = response.cookies.get('session');

    expect(response.status).toBe(200);
    expect(cookie?.expires).toBeInstanceOf(Date);
    const maxAgeDays = ((cookie?.expires as Date).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(maxAgeDays).toBeGreaterThan(20);
  });

  it('rate limits after too many attempts from the same IP', async () => {
    const ip = `10.1.1.${Math.floor(Math.random() * 100000)}`;
    const email = `nobody-${randomUUID()}@example.com`;

    let lastResponse;
    for (let i = 0; i < 10; i += 1) {
      lastResponse = await POST(buildRequest({ email, password: 'WrongPass123' }, ip));
    }
    expect(lastResponse?.status).toBe(401);

    const blocked = await POST(buildRequest({ email, password: 'WrongPass123' }, ip));
    expect(blocked.status).toBe(429);
  });
});
