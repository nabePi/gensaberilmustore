import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { JneTrackingError, fetchJneTracking } from '@/server/shipping/jne-tracking';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteContext>(async (_request, { user, params }) => {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { userId: true, airwaybillNumber: true },
  });

  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  }

  if (!order.airwaybillNumber) {
    return NextResponse.json({ error: 'Airwaybill belum tersedia' }, { status: 404 });
  }

  try {
    const tracking = await fetchJneTracking(order.airwaybillNumber);
    return NextResponse.json(tracking);
  } catch (error) {
    if (error instanceof JneTrackingError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
});
