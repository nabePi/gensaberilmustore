import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, PATCH } from '@/app/api/admin/members/[id]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];

async function createTestUser(role: 'BUYER' | 'AFFILIATE' | 'ADMIN' = 'BUYER') {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({ data: { email, passwordHash, name: 'Test User', role } });
}

async function createAdminCookie() {
  const admin = await createTestUser('ADMIN');
  const { token } = await createSession({ userId: admin.id });
  return `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
}

function buildGetRequest(id: string, cookie?: string) {
  return new NextRequest(`http://localhost/api/admin/members/${id}`, {
    method: 'GET',
    headers: cookie ? { cookie } : undefined,
  });
}

function buildPatchRequest(id: string, body: unknown, cookie?: string) {
  return new NextRequest(`http://localhost/api/admin/members/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

describe('GET /api/admin/members/[id]', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns member detail with order history', async () => {
    const cookie = await createAdminCookie();
    const member = await createTestUser('BUYER');

    const response = await GET(buildGetRequest(member.id, cookie), {
      params: Promise.resolve({ id: member.id }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.id).toBe(member.id);
    expect(Array.isArray(json.orders)).toBe(true);
  });

  it('returns 404 for admin users', async () => {
    const cookie = await createAdminCookie();
    const admin = await createTestUser('ADMIN');

    const response = await GET(buildGetRequest(admin.id, cookie), {
      params: Promise.resolve({ id: admin.id }),
    });

    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/admin/members/[id]', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('updates member role', async () => {
    const cookie = await createAdminCookie();
    const member = await createTestUser('BUYER');

    const response = await PATCH(buildPatchRequest(member.id, { role: 'AFFILIATE' }, cookie), {
      params: Promise.resolve({ id: member.id }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.role).toBe('AFFILIATE');
  });

  it('deactivates affiliate profile when downgraded to buyer', async () => {
    const cookie = await createAdminCookie();
    const member = await createTestUser('AFFILIATE');
    await prisma.affiliateProfile.create({
      data: {
        userId: member.id,
        code: `AFF-${randomUUID()}`,
        payoutBankName: 'Bank',
        payoutBankAccount: '123',
        payoutBankHolder: 'Test User',
      },
    });

    const response = await PATCH(buildPatchRequest(member.id, { role: 'BUYER' }, cookie), {
      params: Promise.resolve({ id: member.id }),
    });

    expect(response.status).toBe(200);
    const profile = await prisma.affiliateProfile.findUnique({ where: { userId: member.id } });
    expect(profile?.isActive).toBe(false);
  });

  it('creates an affiliate profile with a generated code when promoted from buyer to affiliate', async () => {
    const cookie = await createAdminCookie();
    const member = await createTestUser('BUYER');

    const response = await PATCH(buildPatchRequest(member.id, { role: 'AFFILIATE' }, cookie), {
      params: Promise.resolve({ id: member.id }),
    });

    expect(response.status).toBe(200);
    const profile = await prisma.affiliateProfile.findUnique({ where: { userId: member.id } });
    expect(profile).not.toBeNull();
    expect(profile?.code).toBeTruthy();
    expect(profile?.isActive).toBe(true);
  });

  it('reactivates an existing inactive affiliate profile instead of duplicating it', async () => {
    const cookie = await createAdminCookie();
    const member = await createTestUser('BUYER');
    const existingProfile = await prisma.affiliateProfile.create({
      data: {
        userId: member.id,
        code: `AFF-${randomUUID()}`,
        payoutBankName: 'Bank',
        payoutBankAccount: '123',
        payoutBankHolder: 'Test User',
        isActive: false,
      },
    });

    const response = await PATCH(buildPatchRequest(member.id, { role: 'AFFILIATE' }, cookie), {
      params: Promise.resolve({ id: member.id }),
    });

    expect(response.status).toBe(200);
    const profile = await prisma.affiliateProfile.findUnique({ where: { userId: member.id } });
    expect(profile?.id).toBe(existingProfile.id);
    expect(profile?.code).toBe(existingProfile.code);
    expect(profile?.isActive).toBe(true);
  });

  it('rejects invalid role values', async () => {
    const cookie = await createAdminCookie();
    const member = await createTestUser('BUYER');

    const response = await PATCH(buildPatchRequest(member.id, { role: 'ADMIN' }, cookie), {
      params: Promise.resolve({ id: member.id }),
    });

    expect(response.status).toBe(400);
  });
});
