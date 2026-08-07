import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db';
import { getAdminSession, getSession, requireUser, withAuth } from '@/server/auth';
import { hashPassword } from '@/server/auth/password';
import {
  ADMIN_SESSION_COOKIE_NAME,
  createSession,
  SESSION_COOKIE_NAME,
} from '@/server/auth/session';

const createdEmails: string[] = [];

async function createTestUser(role: 'BUYER' | 'ADMIN' = 'BUYER') {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({ data: { email, passwordHash, name: 'Test User', role } });
}

function requestWithCookie(cookie?: string) {
  return new NextRequest('http://localhost/api/whatever', {
    headers: cookie ? { cookie } : undefined,
  });
}

describe('server/auth', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  describe('getSession', () => {
    it('returns null when no session cookie is present', async () => {
      await expect(getSession(requestWithCookie())).resolves.toBeNull();
    });

    it('returns null for an invalid token', async () => {
      await expect(
        getSession(requestWithCookie(`${SESSION_COOKIE_NAME}=not-a-real-token`)),
      ).resolves.toBeNull();
    });

    it('returns the user for a valid member session', async () => {
      const user = await createTestUser('BUYER');
      const { token } = await createSession({ userId: user.id });

      const result = await getSession(requestWithCookie(`${SESSION_COOKIE_NAME}=${token}`));

      expect(result?.id).toBe(user.id);
      expect(result?.role).toBe('BUYER');
    });

    it('returns null once the underlying session row expires', async () => {
      const user = await createTestUser('BUYER');
      const { token, session } = await createSession({ userId: user.id, durationMs: 1 });
      await prisma.session.update({ where: { id: session.id }, data: { expiresAt: new Date(0) } });

      await expect(
        getSession(requestWithCookie(`${SESSION_COOKIE_NAME}=${token}`)),
      ).resolves.toBeNull();
    });
  });

  describe('getAdminSession', () => {
    it('ignores a member session cookie', async () => {
      const user = await createTestUser('ADMIN');
      const { token } = await createSession({ userId: user.id });

      await expect(
        getAdminSession(requestWithCookie(`${SESSION_COOKIE_NAME}=${token}`)),
      ).resolves.toBeNull();
    });

    it('returns the user for a valid admin session cookie', async () => {
      const admin = await createTestUser('ADMIN');
      const { token } = await createSession({ userId: admin.id });

      const result = await getAdminSession(
        requestWithCookie(`${ADMIN_SESSION_COOKIE_NAME}=${token}`),
      );

      expect(result?.id).toBe(admin.id);
    });
  });

  describe('requireUser', () => {
    it('throws UnauthorizedError when there is no session', async () => {
      await expect(requireUser(requestWithCookie())).rejects.toThrow('Sesi tidak ditemukan');
    });

    it('throws ForbiddenError when the role does not match', async () => {
      const buyer = await createTestUser('BUYER');
      const { token } = await createSession({ userId: buyer.id });

      await expect(
        requireUser(requestWithCookie(`${SESSION_COOKIE_NAME}=${token}`), 'AFFILIATE'),
      ).rejects.toThrow('Akses ditolak');
    });

    it('resolves with the user when the role matches', async () => {
      const admin = await createTestUser('ADMIN');
      const { token } = await createSession({ userId: admin.id });

      const result = await requireUser(
        requestWithCookie(`${ADMIN_SESSION_COOKIE_NAME}=${token}`),
        'ADMIN',
      );

      expect(result.id).toBe(admin.id);
    });
  });

  describe('withAuth', () => {
    const handler = withAuth(
      (_request, { user }) => NextResponse.json({ id: user.id, role: user.role }),
      { role: 'ADMIN' },
    );

    it('returns 401 when unauthenticated', async () => {
      const response = await handler(requestWithCookie());
      expect(response.status).toBe(401);
    });

    it('returns 403 when the role does not match', async () => {
      const buyer = await createTestUser('BUYER');
      const { token } = await createSession({ userId: buyer.id });

      const response = await handler(requestWithCookie(`${ADMIN_SESSION_COOKIE_NAME}=${token}`));

      expect(response.status).toBe(403);
    });

    it('invokes the handler with the authenticated user', async () => {
      const admin = await createTestUser('ADMIN');
      const { token } = await createSession({ userId: admin.id });

      const response = await handler(requestWithCookie(`${ADMIN_SESSION_COOKIE_NAME}=${token}`));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.id).toBe(admin.id);
    });
  });
});
