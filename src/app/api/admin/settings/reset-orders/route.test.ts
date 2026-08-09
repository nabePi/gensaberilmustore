import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/admin/settings/reset-orders/route';
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

function buildRequest(body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/admin/settings/reset-orders', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('POST /api/admin/settings/reset-orders', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await POST(buildRequest({ confirm: 'RESET SEMUA PESANAN' }, ''));
    expect(response.status).toBe(401);
  });

  it('rejects a request with an incorrect confirmation phrase', async () => {
    const cookie = await createAdminCookie();
    const response = await POST(buildRequest({ confirm: 'salah' }, cookie));
    expect(response.status).toBe(400);
  });
});
