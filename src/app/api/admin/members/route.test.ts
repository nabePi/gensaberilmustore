import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/members/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];

async function createTestUser(role: 'BUYER' | 'AFFILIATE' | 'ADMIN' = 'BUYER', name?: string) {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({ data: { email, passwordHash, name: name ?? 'Test User', role } });
}

async function createAdminCookie() {
  const admin = await createTestUser('ADMIN');
  const { token } = await createSession({ userId: admin.id });
  return `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(cookie?: string, query = '') {
  return new NextRequest(`http://localhost/api/admin/members${query}`, {
    method: 'GET',
    headers: cookie ? { cookie } : undefined,
  });
}

describe('GET /api/admin/members', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without an admin session', async () => {
    const response = await GET(buildRequest());
    expect(response.status).toBe(401);
  });

  it('lists members excluding admins', async () => {
    const cookie = await createAdminCookie();
    const marker = randomUUID();
    await createTestUser('BUYER', `Buyer-${marker}`);
    await createTestUser('AFFILIATE', `Affiliate-${marker}`);

    const response = await GET(buildRequest(cookie, `?q=${marker}`));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(2);
    expect(json.items.every((item: { role: string }) => item.role !== 'ADMIN')).toBe(true);
  });
});
