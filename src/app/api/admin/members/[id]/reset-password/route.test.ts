import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/admin/members/[id]/reset-password/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdUserIds: string[] = [];

async function createTestUser(role: 'BUYER' | 'ADMIN' = 'BUYER') {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const user = await prisma.user.create({ data: { email, passwordHash, name: 'Test User', role } });
  createdUserIds.push(user.id);
  return user;
}

async function createAdminCookie() {
  const admin = await createTestUser('ADMIN');
  const { token } = await createSession({ userId: admin.id });
  return `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(id: string, cookie?: string) {
  return new NextRequest(`http://localhost/api/admin/members/${id}/reset-password`, {
    method: 'POST',
    headers: cookie ? { cookie } : undefined,
  });
}

describe('POST /api/admin/members/[id]/reset-password', () => {
  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { relatedUserId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without an admin session', async () => {
    const member = await createTestUser('BUYER');
    const response = await POST(buildRequest(member.id), {
      params: Promise.resolve({ id: member.id }),
    });
    expect(response.status).toBe(401);
  });

  it('creates a password reset token for the member', async () => {
    const cookie = await createAdminCookie();
    const member = await createTestUser('BUYER');

    const response = await POST(buildRequest(member.id, cookie), {
      params: Promise.resolve({ id: member.id }),
    });

    expect(response.status).toBe(200);
    const token = await prisma.passwordResetToken.findFirst({ where: { userId: member.id } });
    expect(token).not.toBeNull();

    const notification = await prisma.notification.findFirst({
      where: { relatedUserId: member.id, template: 'PASSWORD_RESET' },
    });
    expect(notification).not.toBeNull();
  });

  it('returns 404 for unknown member', async () => {
    const cookie = await createAdminCookie();
    const response = await POST(buildRequest(randomUUID(), cookie), {
      params: Promise.resolve({ id: randomUUID() }),
    });
    expect(response.status).toBe(404);
  });
});
