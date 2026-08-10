import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { dispatchPendingNotificationsForOrder } from '@/server/notify/dispatch';
import { bulkOrderStatusUpdateSchema } from '@/server/orders/schema';
import { applyOrderStatusTransition, OrderStatusTransitionError } from '@/server/orders/status';

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = bulkOrderStatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { orderIds, toStatus } = parsed.data;
    const success: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const orderId of orderIds) {
      try {
        await prisma.$transaction(async (tx) => {
          const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true },
          });

          if (!order) {
            throw new OrderStatusTransitionError('Order tidak ditemukan');
          }

          await applyOrderStatusTransition(tx, order, toStatus, { changedByUserId: user.id });
        });
        await dispatchPendingNotificationsForOrder(orderId);
        success.push(orderId);
      } catch (error) {
        failed.push({
          id: orderId,
          reason:
            error instanceof OrderStatusTransitionError ? error.message : 'Gagal memproses order',
        });
      }
    }

    return NextResponse.json({ success, failed });
  },
  { role: 'ADMIN' },
);
