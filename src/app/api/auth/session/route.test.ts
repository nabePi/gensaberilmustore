import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/auth/session/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';

const createdEmails: string[] = [];

async function createTestUser() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({
    data: { email, passwordHash, name: 'Test User', role: 'BUYER' },
  });
}

function buildRequest(cookieValue?: string) {
  return new NextRequest('http://localhost/api/auth/session', {
    method: 'GET',
    headers: cookieValue ? { cookie: `session=${cookieValue}` } : undefined,
  });
}

describe('GET /api/auth/session', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns the user for a valid session cookie', async () => {
    const user = await createTestUser();
    const { token } = await createSession({ userId: user.id });

    const response = await GET(buildRequest(token));
    const json = await response.json();

    expect(json.user).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: null,
    });
  });

  it('returns null user when there is no cookie', async () => {
    const response = await GET(buildRequest());
    const json = await response.json();

    expect(json.user).toBeNull();
  });

  it('returns null user for an invalid token', async () => {
    const response = await GET(buildRequest('not-a-real-token'));
    const json = await response.json();

    expect(json.user).toBeNull();
  });

  it('returns null user once the session has been deleted (logout)', async () => {
    const user = await createTestUser();
    const { session, token } = await createSession({ userId: user.id });
    await prisma.session.delete({ where: { id: session.id } });

    const response = await GET(buildRequest(token));
    const json = await response.json();

    expect(json.user).toBeNull();
  });
});
