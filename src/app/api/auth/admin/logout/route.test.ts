import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/auth/admin/logout/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';

const createdEmails: string[] = [];

async function createTestUser() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({
    data: { email, passwordHash, name: 'Test Admin', role: 'ADMIN' },
  });
}

function buildRequest(cookieValue?: string) {
  return new NextRequest('http://localhost/api/auth/admin/logout', {
    method: 'POST',
    headers: cookieValue ? { cookie: `admin_session=${cookieValue}` } : undefined,
  });
}

describe('POST /api/auth/admin/logout', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('deletes the session row and clears the cookie', async () => {
    const admin = await createTestUser();
    const { session, token } = await createSession({ userId: admin.id });

    const response = await POST(buildRequest(token));

    expect(response.status).toBe(204);

    const clearedCookie = response.cookies.get('admin_session');
    expect(clearedCookie?.value).toBe('');
    expect((clearedCookie?.expires as Date).getTime()).toBeLessThan(Date.now());

    const dbSession = await prisma.session.findUnique({ where: { id: session.id } });
    expect(dbSession).toBeNull();
  });

  it('returns 204 when there is no session cookie', async () => {
    const response = await POST(buildRequest());

    expect(response.status).toBe(204);
  });
});
