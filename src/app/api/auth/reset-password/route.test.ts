import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/auth/reset-password/route';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';

const createdEmails: string[] = [];

async function createTestUser() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('OldPassword123');
  return prisma.user.create({
    data: { email, passwordHash, name: 'Test User', role: 'BUYER' },
  });
}

async function createResetToken(
  userId: string,
  overrides: { expiresAt?: Date; usedAt?: Date | null } = {},
) {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
      usedAt: overrides.usedAt ?? null,
    },
  });
  return rawToken;
}

function buildRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/auth/reset-password', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('resets the password, marks the token used, and clears sessions', async () => {
    const user = await createTestUser();
    const rawToken = await createResetToken(user.id);
    await createSession({ userId: user.id });

    const response = await POST(
      buildRequest({
        token: rawToken,
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      }),
    );

    expect(response.status).toBe(200);

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword('NewPassword123', updatedUser.passwordHash)).toBe(true);

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const usedToken = await prisma.passwordResetToken.findFirst({ where: { tokenHash } });
    expect(usedToken?.usedAt).toBeInstanceOf(Date);

    const remainingSessions = await prisma.session.count({ where: { userId: user.id } });
    expect(remainingSessions).toBe(0);
  });

  it('rejects an unknown token with 400', async () => {
    const response = await POST(
      buildRequest({
        token: 'not-a-real-token',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('rejects an expired token with 400', async () => {
    const user = await createTestUser();
    const rawToken = await createResetToken(user.id, {
      expiresAt: new Date(Date.now() - 1000),
    });

    const response = await POST(
      buildRequest({
        token: rawToken,
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('rejects an already-used token with 400', async () => {
    const user = await createTestUser();
    const rawToken = await createResetToken(user.id, { usedAt: new Date() });

    const response = await POST(
      buildRequest({
        token: rawToken,
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('rejects mismatched confirmPassword with 400', async () => {
    const user = await createTestUser();
    const rawToken = await createResetToken(user.id);

    const response = await POST(
      buildRequest({
        token: rawToken,
        password: 'NewPassword123',
        confirmPassword: 'Mismatch123',
      }),
    );

    expect(response.status).toBe(400);
  });
});
