import { createHash, randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';

const sendEmail = vi.fn();

vi.mock('@/server/notify/transport', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

const { POST } = await import('@/app/api/auth/forgot-password/route');

const createdEmails: string[] = [];
const createdUserIds: string[] = [];

async function createTestUser() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const user = await prisma.user.create({
    data: { email, passwordHash, name: 'Test User', role: 'BUYER' },
  });
  createdUserIds.push(user.id);
  return user;
}

function buildRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/auth/forgot-password', () => {
  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { relatedUserId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('creates a reset token for an existing user and returns a generic message', async () => {
    sendEmail.mockResolvedValue({ success: true, providerId: 'provider-1' });
    const user = await createTestUser();

    const response = await POST(buildRequest({ email: user.email }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.message).toBe('Jika email terdaftar, tautan reset dikirim');

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [, , html] = sendEmail.mock.calls[0] as [string, string, string];
    const rawToken = /token=([a-f0-9]+)/.exec(html)?.[1];
    expect(rawToken).toBeTruthy();

    const expectedHash = createHash('sha256')
      .update(rawToken as string)
      .digest('hex');
    const token = await prisma.passwordResetToken.findFirst({ where: { userId: user.id } });
    expect(token?.tokenHash).toBe(expectedHash);
    expect(token?.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const notification = await prisma.notification.findFirst({
      where: { relatedUserId: user.id, template: 'PASSWORD_RESET' },
    });
    expect(notification?.status).toBe('SENT');
  });

  it('returns the same generic message for an unknown email without creating a token', async () => {
    const email = `nobody-${randomUUID()}@example.com`;

    const response = await POST(buildRequest({ email }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.message).toBe('Jika email terdaftar, tautan reset dikirim');
  });

  it('rejects invalid input with 400', async () => {
    const response = await POST(buildRequest({ email: 'not-an-email' }));

    expect(response.status).toBe(400);
  });

  it('stops issuing new tokens after 3 requests within the rate limit window', async () => {
    const user = await createTestUser();

    for (let i = 0; i < 3; i += 1) {
      const response = await POST(buildRequest({ email: user.email }));
      expect(response.status).toBe(200);
    }

    const countBefore = await prisma.passwordResetToken.count({ where: { userId: user.id } });
    expect(countBefore).toBe(3);

    const blockedResponse = await POST(buildRequest({ email: user.email }));
    expect(blockedResponse.status).toBe(200);

    const countAfter = await prisma.passwordResetToken.count({ where: { userId: user.id } });
    expect(countAfter).toBe(3);
  });
});
