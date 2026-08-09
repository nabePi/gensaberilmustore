import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { commissionRateUpsertSchema } from '@/server/affiliate/schema';
import { withAuth } from '@/server/auth';

type RouteContext = { params: Promise<{ productId: string }> };

export const PUT = withAuth<RouteContext>(
  async (request: NextRequest, { params, user }) => {
    const { productId } = await params;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = commissionRateUpsertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { percent, fixedAmount, isActive } = parsed.data;

    const rate = await prisma.affiliateCommissionRate.upsert({
      where: { productId },
      create: {
        productId,
        percent,
        fixedAmount: fixedAmount ?? null,
        isActive,
        updatedByUserId: user.id,
      },
      update: {
        percent,
        fixedAmount: fixedAmount ?? null,
        isActive,
        updatedByUserId: user.id,
      },
    });

    return NextResponse.json({
      productId: rate.productId,
      percent: Number(rate.percent),
      fixedAmount: rate.fixedAmount,
      isActive: rate.isActive,
      updatedAt: rate.updatedAt,
    });
  },
  { role: 'ADMIN' },
);
