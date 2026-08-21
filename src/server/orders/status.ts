import type {
  NotificationTemplate,
  Order,
  OrderItem,
  OrderStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';

export class OrderStatusTransitionError extends Error {}

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  AWAITING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function isValidOrderStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

type Db = PrismaClient | Prisma.TransactionClient;

export type OrderForStatusTransition = Order & { items: OrderItem[] };

export async function applyOrderStatusTransition(
  tx: Db,
  order: OrderForStatusTransition,
  toStatus: OrderStatus,
  {
    note,
    changedByUserId,
    trackingNumber,
  }: { note?: string | null; changedByUserId?: string | null; trackingNumber?: string | null },
): Promise<Order> {
  if (!isValidOrderStatusTransition(order.status, toStatus)) {
    throw new OrderStatusTransitionError(
      `Transisi status dari ${order.status} ke ${toStatus} tidak diizinkan`,
    );
  }

  const effectiveTrackingNumber =
    toStatus === 'SHIPPED' ? (trackingNumber ?? order.trackingNumber) : order.trackingNumber;

  const updated = await tx.order.update({
    where: { id: order.id },
    data: { status: toStatus, trackingNumber: effectiveTrackingNumber },
  });

  await tx.orderStatusHistory.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus,
      changedByUserId: changedByUserId ?? null,
      note: note ?? null,
    },
  });

  await runOrderStatusSideEffects(tx, order, toStatus, effectiveTrackingNumber);

  return updated;
}

async function runOrderStatusSideEffects(
  tx: Db,
  order: OrderForStatusTransition,
  toStatus: OrderStatus,
  trackingNumber: string | null,
): Promise<void> {
  switch (toStatus) {
    case 'PAID':
      await queueOrderNotification(tx, order, 'PAYMENT_RECEIVED');
      await createPendingAffiliateConversion(tx, order);
      break;
    case 'SHIPPED':
      await queueOrderNotification(tx, order, 'ORDER_SHIPPED', trackingNumber);
      break;
    case 'COMPLETED':
      await queueOrderNotification(tx, order, 'ORDER_COMPLETED');
      await approveAffiliateConversion(tx, order);
      break;
    case 'CANCELLED':
      await restoreOrderStock(tx, order);
      await rejectAffiliateConversion(tx, order);
      break;
    default:
      break;
  }
}

async function queueOrderNotification(
  tx: Db,
  order: OrderForStatusTransition,
  template: NotificationTemplate,
  trackingNumber?: string | null,
): Promise<void> {
  if (!order.receiverEmail) return;

  const payloadJson = {
    orderNumber: order.orderNumber,
    receiverName: order.receiverName,
    total: order.total,
    trackingNumber: trackingNumber ?? null,
  };

  await tx.notification.create({
    data: {
      channel: 'EMAIL',
      recipient: order.receiverEmail,
      template,
      relatedOrderId: order.id,
      relatedUserId: order.userId,
      payloadJson,
    },
  });
}

async function restoreOrderStock(tx: Db, order: OrderForStatusTransition): Promise<void> {
  for (const item of order.items) {
    if (!item.productId) continue;
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

async function isOrderEligibleForCommission(
  tx: Db,
  affiliateProfileId: string,
  items: OrderItem[],
): Promise<boolean> {
  const productIds = items
    .map((item) => item.productId)
    .filter((productId): productId is string => productId !== null);

  if (productIds.length === 0) return false;

  const selection = await tx.affiliateProductSelection.findFirst({
    where: { affiliateProfileId, productId: { in: productIds } },
    select: { id: true },
  });

  return selection !== null;
}

async function computeCommissionAmount(tx: Db, items: OrderItem[]): Promise<number> {
  const storeSetting = await tx.storeSetting.findUnique({ where: { id: 1 } });
  const defaultPercent = storeSetting ? Number(storeSetting.defaultCommissionPercent) : 0;

  let total = 0;

  for (const item of items) {
    if (!item.productId) continue;

    const rate = await tx.affiliateCommissionRate.findUnique({
      where: { productId: item.productId },
    });

    if (rate) {
      if (!rate.isActive) continue;
      total +=
        rate.fixedAmount !== null
          ? rate.fixedAmount * item.quantity
          : Math.floor((item.lineTotal * Number(rate.percent)) / 100);
      continue;
    }

    if (defaultPercent > 0) {
      total += Math.floor((item.lineTotal * defaultPercent) / 100);
    }
  }

  return total;
}

async function createPendingAffiliateConversion(
  tx: Db,
  order: OrderForStatusTransition,
): Promise<void> {
  if (!order.affiliateUserId) return;

  const affiliateProfile = await tx.affiliateProfile.findUnique({
    where: { userId: order.affiliateUserId },
  });
  if (!affiliateProfile) return;

  const eligible = await isOrderEligibleForCommission(tx, affiliateProfile.id, order.items);
  if (!eligible) return;

  const commissionAmount = await computeCommissionAmount(tx, order.items);

  await tx.affiliateConversion.create({
    data: {
      affiliateProfileId: affiliateProfile.id,
      orderId: order.id,
      commissionAmount,
      status: 'PENDING',
    },
  });
}

async function approveAffiliateConversion(tx: Db, order: OrderForStatusTransition): Promise<void> {
  const conversion = await tx.affiliateConversion.findUnique({ where: { orderId: order.id } });
  if (!conversion || conversion.status !== 'PENDING') return;

  await tx.affiliateConversion.update({
    where: { id: conversion.id },
    data: { status: 'APPROVED', approvedAt: new Date() },
  });
}

async function rejectAffiliateConversion(tx: Db, order: OrderForStatusTransition): Promise<void> {
  const conversion = await tx.affiliateConversion.findUnique({ where: { orderId: order.id } });
  if (!conversion || conversion.status !== 'PENDING') return;

  await tx.affiliateConversion.update({
    where: { id: conversion.id },
    data: { status: 'REJECTED' },
  });
}
