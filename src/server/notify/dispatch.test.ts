import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';

const sendEmail = vi.fn();

vi.mock('@/server/notify/transport', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

const { dispatchNotification, dispatchPendingNotificationsForOrder, retryFailedNotifications } =
  await import('@/server/notify/dispatch');

const createdNotificationIds: string[] = [];
const createdOrderIds: string[] = [];

async function createOrder() {
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-${randomUUID()}`,
      receiverName: 'Budi Santoso',
      receiverPhone: '08123456789',
      receiverEmail: 'budi@example.com',
      receiverAddress: 'Addr',
      receiverCity: 'City',
      subtotal: 10000,
      shippingCost: 5000,
      discount: 0,
      total: 15000,
      paymentMethod: 'BANK_TRANSFER',
      source: 'ONLINE',
      status: 'AWAITING_PAYMENT',
    },
  });
  createdOrderIds.push(order.id);
  return order;
}

async function createNotification(
  overrides: Partial<Parameters<typeof prisma.notification.create>[0]['data']> = {},
) {
  const notification = await prisma.notification.create({
    data: {
      channel: 'EMAIL',
      recipient: 'buyer@example.com',
      template: 'ORDER_CONFIRMED',
      payloadJson: { orderNumber: 'ORD-1', receiverName: 'Budi', total: 15000 },
      ...overrides,
    },
  });
  createdNotificationIds.push(notification.id);
  return notification;
}

describe('dispatchNotification', () => {
  afterEach(() => {
    sendEmail.mockReset();
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { id: { in: createdNotificationIds } } });
  });

  it('marks a notification as SENT when the email is delivered', async () => {
    sendEmail.mockResolvedValue({ success: true, providerId: 'provider-1' });
    const notification = await createNotification();

    await dispatchNotification(notification.id);

    const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
    expect(updated?.status).toBe('SENT');
    expect(updated?.providerId).toBe('provider-1');
    expect(updated?.sentAt).not.toBeNull();
  });

  it('marks a notification as FAILED with backoff when the email fails', async () => {
    sendEmail.mockResolvedValue({ success: false, error: 'boom' });
    const notification = await createNotification();

    await dispatchNotification(notification.id);

    const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
    expect(updated?.status).toBe('FAILED');
    expect(updated?.error).toBe('boom');
    expect(updated?.attempts).toBe(1);
    expect(updated?.nextRetryAt).not.toBeNull();
  });

  it('fails immediately without retry once max attempts are reached', async () => {
    sendEmail.mockResolvedValue({ success: false, error: 'boom' });
    const notification = await createNotification({ attempts: 2 });

    await dispatchNotification(notification.id);

    const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
    expect(updated?.status).toBe('FAILED');
    expect(updated?.attempts).toBe(3);
    expect(updated?.nextRetryAt).toBeNull();
  });

  it('fails a WhatsApp-channel notification without attempting to send', async () => {
    const notification = await createNotification({ channel: 'WHATSAPP', recipient: '0812' });

    await dispatchNotification(notification.id);

    expect(sendEmail).not.toHaveBeenCalled();
    const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
    expect(updated?.status).toBe('FAILED');
    expect(updated?.error).toBe('Channel WhatsApp belum diintegrasikan');
  });

  it('skips a notification that is already SENT', async () => {
    const notification = await createNotification({ status: 'SENT' });

    await dispatchNotification(notification.id);

    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('dispatchPendingNotificationsForOrder', () => {
  afterEach(() => {
    sendEmail.mockReset();
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { id: { in: createdNotificationIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
  });

  it('dispatches all pending notifications tied to an order', async () => {
    sendEmail.mockResolvedValue({ success: true, providerId: 'provider-2' });
    const order = await createOrder();

    await createNotification({ relatedOrderId: order.id });
    await dispatchPendingNotificationsForOrder(order.id);

    const notifications = await prisma.notification.findMany({
      where: { relatedOrderId: order.id },
    });
    expect(notifications.every((n) => n.status === 'SENT')).toBe(true);
  });
});

describe('retryFailedNotifications', () => {
  afterEach(() => {
    sendEmail.mockReset();
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { id: { in: createdNotificationIds } } });
  });

  it('retries due FAILED notifications and returns the count processed', async () => {
    sendEmail.mockResolvedValue({ success: true, providerId: 'provider-3' });
    const notification = await createNotification({
      status: 'FAILED',
      attempts: 1,
      nextRetryAt: new Date(Date.now() - 1000),
    });

    const retried = await retryFailedNotifications();

    expect(retried).toBeGreaterThanOrEqual(1);
    const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
    expect(updated?.status).toBe('SENT');
  });

  it('ignores FAILED notifications whose nextRetryAt is in the future', async () => {
    const notification = await createNotification({
      status: 'FAILED',
      attempts: 1,
      nextRetryAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await retryFailedNotifications();

    const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
    expect(updated?.status).toBe('FAILED');
    expect(updated?.attempts).toBe(1);
  });
});
