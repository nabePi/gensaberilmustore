import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const sendEmail = vi.fn();

vi.mock('@/server/notify/transport', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

const { POST } = await import('@/app/api/admin/notifications/[id]/retry/route');

const createdEmails: string[] = [];
const createdNotificationIds: string[] = [];

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

function buildRequest(cookie: string) {
  return new NextRequest('http://localhost/api/admin/notifications/x/retry', {
    method: 'POST',
    headers: cookie ? { cookie } : {},
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterEach(() => {
  sendEmail.mockReset();
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { id: { in: createdNotificationIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('POST /api/admin/notifications/[id]/retry', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await POST(buildRequest(''), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a non-existent notification', async () => {
    const cookie = await createAdminCookie();
    const response = await POST(buildRequest(cookie), context(randomUUID()));
    expect(response.status).toBe(404);
  });

  it('retries a FAILED notification and reports the new status', async () => {
    sendEmail.mockResolvedValue({ success: true, providerId: 'provider-1' });
    const cookie = await createAdminCookie();
    const notification = await prisma.notification.create({
      data: {
        channel: 'EMAIL',
        recipient: 'buyer@example.com',
        template: 'ORDER_CONFIRMED',
        status: 'FAILED',
        attempts: 1,
        payloadJson: { orderNumber: 'ORD-1', receiverName: 'Budi', total: 15000 },
      },
    });
    createdNotificationIds.push(notification.id);

    const response = await POST(buildRequest(cookie), context(notification.id));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('SENT');
  });

  it('rejects retrying a notification that was already sent', async () => {
    const cookie = await createAdminCookie();
    const notification = await prisma.notification.create({
      data: {
        channel: 'EMAIL',
        recipient: 'buyer@example.com',
        template: 'ORDER_CONFIRMED',
        status: 'SENT',
        payloadJson: { orderNumber: 'ORD-1', receiverName: 'Budi', total: 15000 },
      },
    });
    createdNotificationIds.push(notification.id);

    const response = await POST(buildRequest(cookie), context(notification.id));
    expect(response.status).toBe(400);
  });
});
