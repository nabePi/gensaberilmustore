import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { updateCitySchema } from '@/server/shipping/schema';

type RouteContext = { params: Promise<{ id: string }> };

export const PUT = withAuth<RouteContext>(
  async (request: NextRequest, { params }) => {
    const { id } = await params;

    const existing = await prisma.city.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Kota tidak ditemukan' }, { status: 404 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = updateCitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const city = await prisma.city.update({ where: { id }, data: parsed.data });

    return NextResponse.json(city);
  },
  { role: 'ADMIN' },
);

export const DELETE = withAuth<RouteContext>(
  async (_request: NextRequest, { params }) => {
    const { id } = await params;

    const existing = await prisma.city.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Kota tidak ditemukan' }, { status: 404 });
    }

    const linkedReceiverCount = await prisma.receiver.count({ where: { cityId: id } });
    if (linkedReceiverCount > 0) {
      return NextResponse.json(
        { error: 'Kota masih digunakan pada alamat penerima yang tersimpan' },
        { status: 409 },
      );
    }

    await prisma.city.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  },
  { role: 'ADMIN' },
);
