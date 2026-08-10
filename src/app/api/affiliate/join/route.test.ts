import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/affiliate/join/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdAffiliateProfileIds: string[] = [];

async function createTestUser() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({ data: { email, passwordHash, name: 'Test User', role: 'BUYER' } });
}

async function createSessionCookie(userId: string) {
  const { token } = await createSession({ userId });
  return `session=${token}`;
}

function buildRequest(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/affiliate/join', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

const validPayload = {
  payoutBankName: 'BCA',
  payoutBankAccount: '1234567890',
  payoutBankHolder: 'Test User',
};

describe('POST /api/affiliate/join', () => {
  afterAll(async () => {
    await prisma.affiliateProfile.deleteMany({ where: { id: { in: createdAffiliateProfileIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without a session', async () => {
    const response = await POST(buildRequest(validPayload));
    expect(response.status).toBe(401);
  });

  it('rejects an invalid payload', async () => {
    const user = await createTestUser();
    const cookie = await createSessionCookie(user.id);

    const response = await POST(buildRequest({}, cookie));
    expect(response.status).toBe(400);
  });

  it('creates an affiliate profile and upgrades the user role', async () => {
    const user = await createTestUser();
    const cookie = await createSessionCookie(user.id);

    const response = await POST(buildRequest(validPayload, cookie));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.code).toBeTruthy();
    createdAffiliateProfileIds.push(json.id);

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser?.role).toBe('AFFILIATE');
  });

  it('rejects joining twice', async () => {
    const user = await createTestUser();
    const cookie = await createSessionCookie(user.id);

    const first = await POST(buildRequest(validPayload, cookie));
    const firstJson = await first.json();
    createdAffiliateProfileIds.push(firstJson.id);

    const second = await POST(buildRequest(validPayload, cookie));
    expect(second.status).toBe(400);
  });
});
