import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { dispatchPendingNotificationsForOrder } from '@/server/notify/dispatch';
import { orderStatusUpdateSchema } from '@/server/orders/schema';
import { orderDetailInclude, serializeOrderDetail } from '@/server/orders/serialize';
import { applyOrderStatusTransition, OrderStatusTransitionError } from '@/server/orders/status';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAuth<RouteContext>(
  async (request: NextRequest, { user, params }) => {
    const { id } = await params;

    const body: unknown = await request.json().catch(() => null);
    const parsed = orderStatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) {
      return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
    }

    try {
      await prisma.$transaction((tx) =>
        applyOrderStatusTransition(tx, order, parsed.data.toStatus, {
          note: parsed.data.note,
          changedByUserId: user.id,
        }),
      );
    } catch (error) {
      if (error instanceof OrderStatusTransitionError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    await dispatchPendingNotificationsForOrder(order.id);

    const updated = await prisma.order.findUnique({ where: { id }, include: orderDetailInclude });
    return NextResponse.json(serializeOrderDetail(updated!));
  },
  { role: 'ADMIN' },
);
