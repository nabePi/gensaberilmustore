import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/notifications/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

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

function buildRequest(url: string, cookie: string) {
  return new NextRequest(url, {
    method: 'GET',
    headers: cookie ? { cookie } : {},
  });
}

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { id: { in: createdNotificationIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/notifications', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('http://localhost/api/admin/notifications', ''));
    expect(response.status).toBe(401);
  });

  it('returns a paginated list of notifications', async () => {
    const cookie = await createAdminCookie();
    const notification = await prisma.notification.create({
      data: {
        channel: 'EMAIL',
        recipient: 'buyer@example.com',
        template: 'ORDER_CONFIRMED',
        payloadJson: { orderNumber: 'ORD-1', receiverName: 'Budi', total: 15000 },
      },
    });
    createdNotificationIds.push(notification.id);

    const response = await GET(buildRequest('http://localhost/api/admin/notifications', cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(typeof json.total).toBe('number');
    expect(Array.isArray(json.items)).toBe(true);
  });

  it('filters by status and channel', async () => {
    const cookie = await createAdminCookie();
    const notification = await prisma.notification.create({
      data: {
        channel: 'EMAIL',
        recipient: 'buyer@example.com',
        template: 'ORDER_CONFIRMED',
        status: 'FAILED',
        payloadJson: { orderNumber: 'ORD-2', receiverName: 'Budi', total: 15000 },
      },
    });
    createdNotificationIds.push(notification.id);

    const response = await GET(
      buildRequest('http://localhost/api/admin/notifications?status=FAILED&channel=EMAIL', cookie),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items.every((item: { status: string }) => item.status === 'FAILED')).toBe(true);
  });
});
