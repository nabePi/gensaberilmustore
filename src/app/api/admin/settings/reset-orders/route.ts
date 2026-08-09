import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';

const resetOrdersSchema = z.object({
  confirm: z.literal('RESET SEMUA PESANAN'),
});

export const POST = withAuth(
  async (request: NextRequest) => {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Reset pesanan hanya diizinkan di lingkungan development' },
        { status: 403 },
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = resetOrdersSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.orderStatusHistory.deleteMany(),
      prisma.affiliateConversion.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
    ]);

    return NextResponse.json({ success: true });
  },
  { role: 'ADMIN' },
);
