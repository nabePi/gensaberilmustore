import { NextRequest } from 'next/server';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';

const sendEmail = vi.fn();

vi.mock('@/server/notify/transport', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

const { POST } = await import('@/app/api/cron/retry-notifications/route');

const createdNotificationIds: string[] = [];

function buildRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/retry-notifications', {
    method: 'POST',
    headers,
  });
}

afterEach(() => {
  sendEmail.mockReset();
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { id: { in: createdNotificationIds } } });
});

describe('POST /api/cron/retry-notifications', () => {
  it('retries due FAILED notifications', async () => {
    sendEmail.mockResolvedValue({ success: true, providerId: 'provider-1' });
    const notification = await prisma.notification.create({
      data: {
        channel: 'EMAIL',
        recipient: 'buyer@example.com',
        template: 'ORDER_CONFIRMED',
        status: 'FAILED',
        attempts: 1,
        nextRetryAt: new Date(Date.now() - 1000),
        payloadJson: { orderNumber: 'ORD-1', receiverName: 'Budi', total: 15000 },
      },
    });
    createdNotificationIds.push(notification.id);

    const response = await POST(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.retried).toBeGreaterThanOrEqual(1);

    const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
    expect(updated?.status).toBe('SENT');
  });
});
