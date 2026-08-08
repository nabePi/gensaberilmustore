import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, PUT } from '@/app/api/member/profile/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession, SESSION_COOKIE_NAME } from '@/server/auth/session';

const createdEmails: string[] = [];

async function createMemberCookie(overrides: Partial<{ name: string; phone: string }> = {}) {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const user = await prisma.user.create({
    data: { email, passwordHash, name: 'Member', role: 'BUYER', ...overrides },
  });
  const { token } = await createSession({ userId: user.id });
  return { cookie: `${SESSION_COOKIE_NAME}=${token}`, user };
}

function buildRequest(method: string, body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/member/profile', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/member/profile', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''));
    expect(response.status).toBe(401);
  });

  it('returns the authenticated member profile', async () => {
    const { cookie, user } = await createMemberCookie();
    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.id).toBe(user.id);
    expect(json.email).toBe(user.email);
    expect(json.role).toBe('BUYER');
    expect(json).toHaveProperty('phone');
    expect(json).toHaveProperty('whatsappNumber');
    expect(json).toHaveProperty('createdAt');
    expect(json).not.toHaveProperty('passwordHash');
  });
});

describe('PUT /api/member/profile', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await PUT(buildRequest('PUT', { name: 'New Name' }, ''));
    expect(response.status).toBe(401);
  });

  it('rejects an invalid payload', async () => {
    const { cookie } = await createMemberCookie();
    const response = await PUT(buildRequest('PUT', { name: '' }, cookie));
    expect(response.status).toBe(400);
  });

  it('updates the profile fields', async () => {
    const { cookie } = await createMemberCookie();
    const response = await PUT(
      buildRequest(
        'PUT',
        { name: 'Updated Name', phone: '08123456789', whatsappNumber: '08129876543' },
        cookie,
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.name).toBe('Updated Name');
    expect(json.phone).toBe('08123456789');
    expect(json.whatsappNumber).toBe('08129876543');
  });

  it('does not change the email', async () => {
    const { cookie, user } = await createMemberCookie();
    const response = await PUT(
      buildRequest('PUT', { name: 'Updated Name', email: 'hacker@example.com' }, cookie),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.email).toBe(user.email);
  });
});
