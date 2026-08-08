import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { orderDetailInclude, serializeOrderDetail } from '@/server/orders/serialize';
import { applyOrderStatusTransition, OrderStatusTransitionError } from '@/server/orders/status';

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAuth<RouteContext>(async (_request, { user, params }) => {
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });

  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  }

  if (order.status !== 'AWAITING_PAYMENT') {
    return NextResponse.json({ error: 'Order tidak bisa dibatalkan' }, { status: 400 });
  }

  try {
    await prisma.$transaction((tx) =>
      applyOrderStatusTransition(tx, order, 'CANCELLED', { changedByUserId: user.id }),
    );
  } catch (error) {
    if (error instanceof OrderStatusTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const updated = await prisma.order.findUnique({ where: { id }, include: orderDetailInclude });
  return NextResponse.json(serializeOrderDetail(updated!));
});
