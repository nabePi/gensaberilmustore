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
  { note, changedByUserId }: { note?: string | null; changedByUserId?: string | null },
): Promise<Order> {
  if (!isValidOrderStatusTransition(order.status, toStatus)) {
    throw new OrderStatusTransitionError(
      `Transisi status dari ${order.status} ke ${toStatus} tidak diizinkan`,
    );
  }

  const updated = await tx.order.update({
    where: { id: order.id },
    data: { status: toStatus },
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

  await runOrderStatusSideEffects(tx, order, toStatus);

  return updated;
}

async function runOrderStatusSideEffects(
  tx: Db,
  order: OrderForStatusTransition,
  toStatus: OrderStatus,
): Promise<void> {
  switch (toStatus) {
    case 'PAID':
      await queueOrderNotification(tx, order, 'PAYMENT_RECEIVED');
      break;
    case 'SHIPPED':
      await queueOrderNotification(tx, order, 'ORDER_SHIPPED');
      break;
    case 'COMPLETED':
      await queueOrderNotification(tx, order, 'ORDER_COMPLETED');
      await finalizeAffiliateConversion(tx, order);
      break;
    case 'CANCELLED':
      await restoreOrderStock(tx, order);
      break;
    default:
      break;
  }
}

async function queueOrderNotification(
  tx: Db,
  order: OrderForStatusTransition,
  template: NotificationTemplate,
): Promise<void> {
  const payloadJson = { orderId: order.id, orderNumber: order.orderNumber };

  await tx.notification.createMany({
    data: [
      {
        channel: 'EMAIL',
        recipient: order.receiverEmail,
        template,
        relatedOrderId: order.id,
        relatedUserId: order.userId,
        payloadJson,
      },
      {
        channel: 'WHATSAPP',
        recipient: order.receiverPhone,
        template,
        relatedOrderId: order.id,
        relatedUserId: order.userId,
        payloadJson,
      },
    ],
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

async function computeCommissionAmount(tx: Db, items: OrderItem[]): Promise<number> {
  let total = 0;

  for (const item of items) {
    if (!item.productId) continue;

    const rate = await tx.affiliateCommissionRate.findUnique({
      where: { productId: item.productId },
    });

    if (!rate || !rate.isActive) continue;

    if (rate.fixedAmount !== null) {
      total += rate.fixedAmount * item.quantity;
    } else {
      total += Math.floor((item.lineTotal * Number(rate.percent)) / 100);
    }
  }

  return total;
}

async function finalizeAffiliateConversion(tx: Db, order: OrderForStatusTransition): Promise<void> {
  if (!order.affiliateUserId) return;

  const affiliateProfile = await tx.affiliateProfile.findUnique({
    where: { userId: order.affiliateUserId },
  });
  if (!affiliateProfile) return;

  const existing = await tx.affiliateConversion.findUnique({ where: { orderId: order.id } });

  if (existing) {
    if (existing.status === 'PENDING') {
      await tx.affiliateConversion.update({
        where: { id: existing.id },
        data: { status: 'APPROVED', approvedAt: new Date() },
      });
    }
    return;
  }

  const commissionAmount = await computeCommissionAmount(tx, order.items);

  await tx.affiliateConversion.create({
    data: {
      affiliateProfileId: affiliateProfile.id,
      orderId: order.id,
      commissionAmount,
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  });
}
