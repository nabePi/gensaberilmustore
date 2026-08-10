import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { getSession } from '@/server/auth';
import { applyMidtransTransactionStatus } from '@/server/payment/apply-status';
import { getStatus } from '@/server/payment/midtrans';

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { orderId } = await params;
  const user = await getSession(request);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || (order.userId !== null && order.userId !== user?.id)) {
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  }

  if (order.status === 'AWAITING_PAYMENT') {
    const midtransStatus = await getStatus(order.orderNumber).catch(() => null);
    if (midtransStatus) {
      await prisma.$transaction(async (tx) => {
        await applyMidtransTransactionStatus(tx, order, midtransStatus);
      });
    }
  }

  const [freshOrder, paymentSession] = await Promise.all([
    prisma.order.findUnique({ where: { id: order.id }, select: { status: true } }),
    prisma.paymentSession.findUnique({ where: { orderId: order.id } }),
  ]);

  return NextResponse.json({
    orderStatus: freshOrder?.status ?? order.status,
    transactionStatus: paymentSession?.lastTransactionStatus ?? null,
    vaNumber: paymentSession?.vaNumber ?? null,
    expireAt: paymentSession?.expiresAt ?? null,
  });
}
