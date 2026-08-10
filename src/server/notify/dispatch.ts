import type { NotificationTemplate, Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import {
  affiliatePayoutEmail,
  AffiliatePayoutPayload,
} from '@/server/notify/templates/affiliatePayout';
import {
  affiliateWelcomeEmail,
  AffiliateWelcomePayload,
} from '@/server/notify/templates/affiliateWelcome';
import {
  orderCompletedEmail,
  OrderCompletedPayload,
} from '@/server/notify/templates/orderCompleted';
import {
  orderConfirmedEmail,
  OrderConfirmedPayload,
} from '@/server/notify/templates/orderConfirmed';
import { orderShippedEmail, OrderShippedPayload } from '@/server/notify/templates/orderShipped';
import { passwordResetEmail, PasswordResetPayload } from '@/server/notify/templates/passwordReset';
import {
  paymentReceivedEmail,
  PaymentReceivedPayload,
} from '@/server/notify/templates/paymentReceived';
import { sendEmail } from '@/server/notify/transport';

export const MAX_NOTIFICATION_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 5 * 60 * 1000;

function renderEmail(
  template: NotificationTemplate,
  payloadJson: Prisma.JsonValue,
): { subject: string; html: string } | null {
  switch (template) {
    case 'ORDER_CONFIRMED':
      return orderConfirmedEmail(payloadJson as unknown as OrderConfirmedPayload);
    case 'PAYMENT_RECEIVED':
      return paymentReceivedEmail(payloadJson as unknown as PaymentReceivedPayload);
    case 'ORDER_SHIPPED':
      return orderShippedEmail(payloadJson as unknown as OrderShippedPayload);
    case 'ORDER_COMPLETED':
      return orderCompletedEmail(payloadJson as unknown as OrderCompletedPayload);
    case 'PASSWORD_RESET':
      return passwordResetEmail(payloadJson as unknown as PasswordResetPayload);
    case 'AFFILIATE_JOIN':
      return affiliateWelcomeEmail(payloadJson as unknown as AffiliateWelcomePayload);
    case 'AFFILIATE_PAYOUT':
      return affiliatePayoutEmail(payloadJson as unknown as AffiliatePayoutPayload);
    default:
      return null;
  }
}

export function computeNextRetryAt(attempts: number): Date | null {
  if (attempts >= MAX_NOTIFICATION_ATTEMPTS) return null;
  return new Date(Date.now() + BACKOFF_BASE_MS * 2 ** (attempts - 1));
}

export async function retryFailedNotifications(): Promise<number> {
  const due = await prisma.notification.findMany({
    where: {
      status: 'FAILED',
      attempts: { lt: MAX_NOTIFICATION_ATTEMPTS },
      nextRetryAt: { lte: new Date() },
    },
    select: { id: true },
  });

  await Promise.all(due.map((notification) => dispatchNotification(notification.id)));

  return due.length;
}

export async function dispatchPendingNotificationsForOrder(orderId: string): Promise<void> {
  const pending = await prisma.notification.findMany({
    where: { relatedOrderId: orderId, status: 'PENDING' },
    select: { id: true },
  });

  await Promise.all(pending.map((notification) => dispatchNotification(notification.id)));
}

export async function dispatchNotification(notificationId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.status === 'SENT') return;

  if (notification.channel !== 'EMAIL') {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'FAILED', error: 'Channel WhatsApp belum diintegrasikan', nextRetryAt: null },
    });
    return;
  }

  const rendered = renderEmail(notification.template, notification.payloadJson);
  if (!rendered) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'FAILED', error: `Template ${notification.template} tidak dikenal` },
    });
    return;
  }

  const result = await sendEmail(notification.recipient, rendered.subject, rendered.html);
  const attempts = notification.attempts + 1;

  if (result.success) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'SENT',
        providerId: result.providerId,
        error: null,
        sentAt: new Date(),
        attempts,
        nextRetryAt: null,
      },
    });
    return;
  }

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      status: 'FAILED',
      error: result.error,
      attempts,
      nextRetryAt: computeNextRetryAt(attempts),
    },
  });
}
