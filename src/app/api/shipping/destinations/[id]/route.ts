import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const destination = await prisma.destination.findUnique({
    where: { id },
    select: {
      id: true,
      provinceName: true,
      cityName: true,
      districtName: true,
      subdistrictName: true,
      zipCode: true,
    },
  });

  if (!destination) {
    return NextResponse.json({ error: 'Tujuan tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json(destination);
}
