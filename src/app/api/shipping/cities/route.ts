import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { listCitiesQuerySchema } from '@/server/shipping/schema';

export async function GET(request: NextRequest) {
  const parsed = listCitiesQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { q } = parsed.data;

  const cities = await prisma.city.findMany({
    where: {
      isActive: true,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    },
    select: { id: true, name: true, province: true, shippingCost: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(
    { items: cities },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
