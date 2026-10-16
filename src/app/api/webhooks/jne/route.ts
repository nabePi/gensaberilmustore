import { timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { env } from '@/env';
import { prisma } from '@/lib/db';
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

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failure('Payload JNE tidak valid', 400);
  }
  const data = parsed.data;
  if (data.status !== 'DELIVERED') {
    return Response.json({ status: true });
  }

  try {
    const result = await prisma.$transaction<
      { orderId: string } | { error: string; status: number }
    >(async (tx) => {
      // Serialize repeated deliveries for the same order before checking its status.
      await tx.$executeRaw`SELECT id FROM "Order" WHERE "orderNumber" = ${data.order_id} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { orderNumber: data.order_id },
        include: { items: true },
      });
      if (!order || order.shippingMethod !== 'JNE' || order.airwaybillNumber !== data.awb) {
        return { error: 'Order atau nomor resi JNE tidak cocok', status: 404 };
      }
      if (order.status === 'COMPLETED') {
        return { orderId: order.id };
      }
      if (order.status !== 'SHIPPED') {
        return { error: 'Order belum berstatus dikirim', status: 409 };
      }

      await applyOrderStatusTransition(tx, order, 'COMPLETED', {
        note: `JNE DELIVERED: ${data.awb}`,
      });
      return { orderId: order.id };
    });

    if ('error' in result) {
      return failure(result.error, result.status);
    }
    await dispatchPendingNotificationsForOrder(result.orderId);
    return Response.json({ status: true });
  } catch {
    return failure('Gagal memproses webhook JNE, silakan coba lagi', 500);
  }
}
