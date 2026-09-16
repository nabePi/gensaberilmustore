import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { STORE_ADDRESS, STORE_LEGAL_NAME, STORE_PHONE } from '@/lib/site';
import { withAuth } from '@/server/auth';
import { orderDetailInclude, serializeOrderDetail } from '@/server/orders/serialize';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteContext>(
  async (request: NextRequest, { params }) => {
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id }, include: orderDetailInclude });

    if (!order || order.source !== 'POS') {
      return NextResponse.json({ error: 'Transaksi POS tidak ditemukan' }, { status: 404 });
    }

    if (request.nextUrl.searchParams.get('print') === 'true') {
      await prisma.order.update({ where: { id }, data: { posReceiptPrintedAt: new Date() } });
    }

    return NextResponse.json({
      order: serializeOrderDetail(order),
      store: { name: STORE_LEGAL_NAME, address: STORE_ADDRESS, phone: STORE_PHONE },
    });
  },
  { role: 'ADMIN' },
);
