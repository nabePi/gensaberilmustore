import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { generateAirwaybillForOrder } from '@/server/orders/generate-airwaybill';
import { orderDetailInclude, serializeOrderDetail } from '@/server/orders/serialize';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Manual fallback for airwaybill (resi) generation, used from the admin UI
 * when the automatic attempt on marking an order PAID failed (e.g. JNE
 * server error).
 */
export const POST = withAuth<RouteContext>(
  async (_request, { params }) => {
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
    }

    if (order.shippingMethod !== 'JNE') {
      return NextResponse.json(
        { error: 'Order ini tidak menggunakan pengiriman JNE' },
        { status: 400 },
      );
    }

    if (order.status === 'AWAITING_PAYMENT' || order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Order belum lunas atau sudah dibatalkan' },
        { status: 400 },
      );
    }

    if (order.airwaybillNumber) {
      return NextResponse.json(
        { error: 'Airwaybill sudah dibuat untuk order ini' },
        { status: 400 },
      );
    }

    const result = await generateAirwaybillForOrder(order.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const updated = await prisma.order.findUnique({ where: { id }, include: orderDetailInclude });
    return NextResponse.json(serializeOrderDetail(updated!));
  },
  { role: 'ADMIN' },
);
