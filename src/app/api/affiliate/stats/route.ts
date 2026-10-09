import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { summarizeConversions } from '@/server/affiliate/stats';
import { withAuth } from '@/server/auth';

export const GET = withAuth(async (_request, { user }) => {
  const profile = await prisma.affiliateProfile.findUnique({ where: { userId: user.id } });

  if (!profile) {
    return NextResponse.json({ error: 'Anda belum menjadi afiliasi' }, { status: 404 });
  }

  const [totalClicks, conversions, selections] = await Promise.all([
    prisma.affiliateClick.count({ where: { affiliateProfileId: profile.id } }),
    prisma.affiliateConversion.findMany({ where: { affiliateProfileId: profile.id } }),
    prisma.affiliateProductSelection.findMany({
      where: { affiliateProfileId: profile.id },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            commissionRate: { select: { percent: true, fixedAmount: true, isActive: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const summary = summarizeConversions(conversions);

  const productPerformance = await Promise.all(
    selections.map(async (selection) => {
      const revenue = await prisma.orderItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          productId: selection.productId,
          order: {
            affiliateUserId: user.id,
            // Same rule as "Order Selesai": only completed orders count, never cancelled ones.
            affiliateConversion: { is: { status: { in: ['APPROVED', 'PAID'] } } },
          },
        },
      });

      return {
        productId: selection.productId,
        title: selection.product.title,
        slug: selection.product.slug,
        commissionRate: selection.product.commissionRate
          ? {
              percent: Number(selection.product.commissionRate.percent),
              fixedAmount: selection.product.commissionRate.fixedAmount,
              isActive: selection.product.commissionRate.isActive,
            }
          : null,
        totalRevenue: revenue._sum.lineTotal ?? 0,
      };
    }),
  );

  return NextResponse.json({
    profile: { code: profile.code, isActive: profile.isActive, status: profile.status },
    totalClicks,
    ...summary,
    productPerformance,
  });
});
