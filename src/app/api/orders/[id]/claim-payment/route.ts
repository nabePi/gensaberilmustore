import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { getSession } from '@/server/auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) {
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  }

  if (order.userId !== null) {
    const user = await getSession(request);
    if (!user || user.id !== order.userId) {
      return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
    }
  }

  if (order.status !== 'AWAITING_PAYMENT' || order.manualPaymentCode === null) {
    return NextResponse.json({ error: 'Pesanan tidak dapat diklaim' }, { status: 400 });
  }

  const updated =
    order.paymentClaimedAt !== null
      ? order
      : await prisma.order.update({
          where: { id },
          data: { paymentClaimedAt: new Date() },
        });

  return NextResponse.json({ paymentClaimedAt: updated.paymentClaimedAt });
}
