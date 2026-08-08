import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { orderDetailInclude, serializeOrderDetail } from '@/server/orders/serialize';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteContext>(async (_request, { user, params }) => {
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id }, include: orderDetailInclude });

  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json(serializeOrderDetail(order));
});
