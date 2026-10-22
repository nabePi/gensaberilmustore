import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/db';
import { generateJneAirwaybill } from '@/server/shipping/jne-airwaybill';

export type GenerateAirwaybillResult =
  { ok: true; skipped?: 'pre_order' } | { ok: false; error: string };

/**
 * Best-effort side effect run after an order is marked PAID: generates a JNE
 * airwaybill (resi) and stores it on the order. Never throws, so a JNE
 * outage or missing config never blocks the admin's status-change action —
 * callers that need to surface the failure (e.g. a manual retry) can inspect
 * the returned result instead.
 * Skipped entirely for orders picked up by the buyer (SELF_PICKUP) — there is
 * no shipment to generate a resi for.
 */
export async function generateAirwaybillForOrder(
  orderId: string,
  db: PrismaClient | Prisma.TransactionClient = prisma,
  { allowPreOrder = false }: { allowPreOrder?: boolean } = {},
): Promise<GenerateAirwaybillResult> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { select: { isPreOrderActive: true } } } },
        destination: true,
      },
    });

    if (
      !order ||
      !order.destination ||
      order.airwaybillNumber ||
      order.shippingMethod !== 'JNE' ||
      order.status === 'AWAITING_PAYMENT' ||
      order.status === 'CANCELLED'
    ) {
      return { ok: true };
    }

    if (
      !allowPreOrder &&
      order.items.some((item) => item.isPreOrderSnapshot || item.product?.isPreOrderActive)
    ) {
      return { ok: true, skipped: 'pre_order' };
    }

    const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

    const cnoteNo = await generateJneAirwaybill({
      orderNumber: order.orderNumber,
      service: order.shippingService,
      destinationTariffCode: order.destination.tariffCode,
      receiverName: order.receiverName,
      receiverAddress: order.receiverAddress,
      receiverCity: order.destination.cityName,
      receiverRegion: order.destination.provinceName,
      receiverZip: order.destination.zipCode,
      receiverPhone: order.receiverPhone,
      quantity,
      weightKg: order.weightKg,
      goodsValue: order.subtotal,
      goodsDesc: `Pesanan ${order.orderNumber}`,
    });

    await db.order.update({
      where: { id: order.id },
      data: { airwaybillNumber: cnoteNo },
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat airwaybill JNE';
    console.error(`Gagal membuat airwaybill JNE untuk order ${orderId}:`, {
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { ok: false, error: message };
  }
}
