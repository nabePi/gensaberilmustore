import type { Prisma, PrismaClient } from '@prisma/client';

import { applyOrderStatusTransition, type OrderForStatusTransition } from '@/server/orders/status';
import type { MidtransTransactionStatus } from '@/server/payment/midtrans';

type Db = PrismaClient | Prisma.TransactionClient;

const SETTLED_STATUSES = ['settlement', 'capture'];
const FAILED_STATUSES = ['deny', 'cancel', 'expire', 'failure'];

export async function applyMidtransTransactionStatus(
  tx: Db,
  order: OrderForStatusTransition,
  midtransStatus: MidtransTransactionStatus,
): Promise<void> {
  const { transactionStatus, fraudStatus, vaNumber } = midtransStatus;

  await tx.paymentSession.updateMany({
    where: { orderId: order.id },
    data: {
      lastTransactionStatus: transactionStatus,
      ...(vaNumber ? { vaNumber } : {}),
    },
  });

  if (order.status !== 'AWAITING_PAYMENT') return;

  if (SETTLED_STATUSES.includes(transactionStatus) && fraudStatus !== 'deny') {
    await applyOrderStatusTransition(tx, order, 'PAID', {
      note: `Midtrans: ${transactionStatus}`,
    });
    return;
  }

  if (FAILED_STATUSES.includes(transactionStatus) || fraudStatus === 'deny') {
    await applyOrderStatusTransition(tx, order, 'CANCELLED', {
      note: `Midtrans: ${transactionStatus}`,
    });
  }
}
