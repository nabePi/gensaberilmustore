import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';

export const GET = withAuth(
  async () => {
    const rates = await prisma.affiliateCommissionRate.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { product: { select: { id: true, title: true, sku: true, finalPrice: true } } },
    });

    return NextResponse.json({
      items: rates.map((rate) => ({
        productId: rate.productId,
        title: rate.product.title,
        sku: rate.product.sku,
        finalPrice: rate.product.finalPrice,
        percent: Number(rate.percent),
        fixedAmount: rate.fixedAmount,
        isActive: rate.isActive,
        updatedAt: rate.updatedAt,
      })),
    });
  },
  { role: 'ADMIN' },
);
