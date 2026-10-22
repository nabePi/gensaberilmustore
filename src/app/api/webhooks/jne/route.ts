import { createHash, timingSafeEqual } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { env } from '@/env';
import { prisma } from '@/lib/db';
import { safeDeliveryPhotoUrl } from '@/lib/delivery-proof';
import { dispatchPendingNotificationsForOrder } from '@/server/notify/dispatch';
import { applyOrderStatusTransition } from '@/server/orders/status';

const payloadSchema = z.object({
  awb: z.string().trim().min(1),
  order_id: z.string().trim().min(1),
  status: z.enum([
    'SUCCESS PICKUP',
    'FAILED PICKUP',
    'SHIPPED',
    'DELIVERED',
    'SHIPMENT PROBLEM',
    'RETURN TO SHIPPER',
  ]),
  photo: z.string().trim().nullish(),
  receiver_name: z.string().trim().nullish(),
  receiver_relation: z.string().trim().nullish(),
});

function failure(reason: string, status: number) {
  return Response.json({ status: false, reason }, { status });
}

export async function POST(request: Request) {
  if (!env.jneWebhookSecret) {
    return failure('Webhook JNE belum dikonfigurasi', 503);
  }

  const token = new URL(request.url).searchParams.get('token') ?? '';
  const provided = Buffer.from(token);
  const expected = Buffer.from(env.jneWebhookSecret);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return failure('Unauthorized', 401);
  }

  const rawPayload: unknown = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return failure('Payload JNE tidak valid', 400);
  }
  const data = parsed.data;
  const providerEventId = `jne:${createHash('sha256').update(JSON.stringify(rawPayload)).digest('hex')}`;

  try {
    const result = await prisma.$transaction<
      { orderId: string | null } | { error: string; status: number }
    >(async (tx) => {
      const archive = async <T>(result: T): Promise<T> => {
        // Keep the complete parsed JSON (including unknown JNE fields), never the URL/token.
        await tx.webhookLog.upsert({
          where: { providerEventId },
          create: {
            provider: 'jne',
            providerEventId,
            payload: rawPayload as Prisma.InputJsonValue,
            processedAt: new Date(),
          },
          update: {},
        });
        return result;
      };
      if (data.status !== 'DELIVERED') return archive({ orderId: null });
      // Serialize repeated deliveries for the same order before checking its status.
      await tx.$executeRaw`SELECT id FROM "Order" WHERE "orderNumber" = ${data.order_id} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { orderNumber: data.order_id },
        include: { items: true },
      });
      if (!order || order.shippingMethod !== 'JNE' || order.airwaybillNumber !== data.awb) {
        return archive({ error: 'Order atau nomor resi JNE tidak cocok', status: 404 });
      }
      if (order.status !== 'SHIPPED' && order.status !== 'COMPLETED') {
        return archive({ error: 'Order belum berstatus dikirim', status: 409 });
      }

      // Keep the first non-empty evidence, including across webhook retries.
      const proof = {
        deliveryPhotoUrl: order.deliveryPhotoUrl || safeDeliveryPhotoUrl(data.photo),
        deliveryReceiverName: order.deliveryReceiverName || data.receiver_name || null,
        deliveryReceiverRelation: order.deliveryReceiverRelation || data.receiver_relation || null,
        // This is when JNE confirmed delivery to us, not the actual handover time.
        deliveryConfirmedAt: order.deliveryConfirmedAt ?? new Date(),
      };
      if (
        Object.entries(proof).some(([key, value]) => order[key as keyof typeof proof] !== value)
      ) {
        await tx.order.update({ where: { id: order.id }, data: proof });
      }
      if (order.status === 'COMPLETED') return archive({ orderId: order.id });

      await applyOrderStatusTransition(tx, { ...order, ...proof }, 'COMPLETED', {
        note: `JNE DELIVERED: ${data.awb}`,
      });
      return archive({ orderId: order.id });
    });

    if ('error' in result) {
      return failure(result.error, result.status);
    }
    if (result.orderId) {
      const orderId = result.orderId;
      // Serialize notification dispatch too: two simultaneous retries must not
      // both read the same PENDING completion email after the first commit.
      await prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
          await dispatchPendingNotificationsForOrder(orderId, tx);
        },
        { timeout: 60_000 },
      );
    }
    return Response.json({ status: true });
  } catch {
    return failure('Gagal memproses webhook JNE, silakan coba lagi', 500);
  }
}
