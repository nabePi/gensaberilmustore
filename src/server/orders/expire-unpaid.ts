import { prisma } from '@/lib/db';
import { applyOrderStatusTransition } from '@/server/orders/status';

export const UNPAID_ORDER_TTL_MS = 24 * 60 * 60 * 1000;
export const EXPIRY_BATCH_SIZE = 50;
export const UNPAID_ORDER_EXPIRY_NOTE =
  'Dibatalkan oleh sistem karena melewati batas pembayaran 24 jam.';

export async function cancelExpiredUnpaidOrders(now = new Date()) {
  const cutoffAt = new Date(now.getTime() - UNPAID_ORDER_TTL_MS);
  const cancelled = await prisma.$transaction(
    async (tx) => {
      // Lock eligible orders before reading their items. Concurrent scheduler runs
      // skip each other's rows; payment/claim updates must finish before eligibility
      // is checked, or wait until this cancellation has committed.
      const candidates = await tx.$queryRaw<{ id: string }[]>`
      SELECT o.id FROM "Order" o
      WHERE o.source = 'ONLINE' AND o.status = 'AWAITING_PAYMENT'
        AND o."createdAt" <= ${cutoffAt}
        AND o."paymentClaimedAt" IS NULL
        AND o."paymentProofUrl" IS NULL AND o."paymentProofUploadedAt" IS NULL
        AND NOT EXISTS (SELECT 1 FROM "PaymentSession" p WHERE p."orderId" = o.id)
      ORDER BY o."createdAt", o.id
      LIMIT ${EXPIRY_BATCH_SIZE} FOR UPDATE OF o SKIP LOCKED
    `;
      for (const candidate of candidates) {
        const order = await tx.order.findUniqueOrThrow({
          where: { id: candidate.id },
          include: { items: true },
        });
        await applyOrderStatusTransition(tx, order, 'CANCELLED', {
          note: UNPAID_ORDER_EXPIRY_NOTE,
        });
      }
      return candidates.length;
    },
    { timeout: 30_000 },
  );
  return { cancelled, hasMore: cancelled === EXPIRY_BATCH_SIZE, cutoffAt: cutoffAt.toISOString() };
}
