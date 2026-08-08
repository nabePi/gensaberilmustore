import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { createReceiverSchema } from '@/server/member/schema';

const RECEIVER_INCLUDE = {
  city: { select: { name: true, shippingCost: true } },
} as const;

export const GET = withAuth(async (_request: NextRequest, { user }) => {
  const receivers = await prisma.receiver.findMany({
    where: { userId: user.id },
    include: RECEIVER_INCLUDE,
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  });

  return NextResponse.json({ items: receivers });
});

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createReceiverSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

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

  const { isDefault, ...data } = parsed.data;

  const receiver = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.receiver.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    }

    return tx.receiver.create({
      data: { ...data, userId: user.id, isDefault: isDefault ?? false },
      include: RECEIVER_INCLUDE,
    });
  });

  return NextResponse.json(receiver, { status: 201 });
});
