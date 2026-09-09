import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';

type RouteContext = { params: Promise<{ productId: string }> };

export const DELETE = withAuth<RouteContext>(async (_request: NextRequest, { params, user }) => {
  const { productId } = await params;

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Wishlist tidak ditemukan' }, { status: 404 });
  }

  await prisma.wishlistItem.delete({ where: { id: existing.id } });

  return new NextResponse(null, { status: 204 });
});
