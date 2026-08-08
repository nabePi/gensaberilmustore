import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { updateReceiverSchema } from '@/server/member/schema';

type RouteContext = { params: Promise<{ id: string }> };

const RECEIVER_INCLUDE = {
  city: { select: { name: true, shippingCost: true } },
} as const;

export const PUT = withAuth<RouteContext>(async (request: NextRequest, { params, user }) => {
  const { id } = await params;

  const existing = await prisma.receiver.findUnique({ where: { id }, select: { userId: true } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Alamat tidak ditemukan' }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = updateReceiverSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (parsed.data.cityId) {
    const city = await prisma.city.findUnique({
      where: { id: parsed.data.cityId },
      select: { id: true },
    });
    if (!city) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: { cityId: ['Kota tidak ditemukan'] } },
        { status: 400 },
      );
    }
  }

  const { isDefault, ...data } = parsed.data;

  const receiver = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.receiver.updateMany({
        where: { userId: user.id, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return tx.receiver.update({
      where: { id },
      data: { ...data, ...(isDefault !== undefined ? { isDefault } : {}) },
      include: RECEIVER_INCLUDE,
    });
  });

  return NextResponse.json(receiver);
});

export const DELETE = withAuth<RouteContext>(async (_request: NextRequest, { params, user }) => {
  const { id } = await params;

  const existing = await prisma.receiver.findUnique({
    where: { id },
    select: { userId: true, isDefault: true },
  });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Alamat tidak ditemukan' }, { status: 404 });
  }

  await prisma.receiver.delete({ where: { id } });

  if (existing.isDefault) {
    const nextDefault = await prisma.receiver.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });

    if (nextDefault) {
      await prisma.receiver.update({ where: { id: nextDefault.id }, data: { isDefault: true } });
    }
  }

  return new NextResponse(null, { status: 204 });
});
