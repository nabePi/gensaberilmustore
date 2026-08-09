import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';

export const GET = withAuth(async (_request, { user }) => {
  const profile = await prisma.affiliateProfile.findUnique({ where: { userId: user.id } });

  if (!profile) {
    return NextResponse.json({ error: 'Anda belum menjadi afiliasi' }, { status: 404 });
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

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

  const commissionPending = conversions
    .filter((conversion) => conversion.status === 'PENDING' || conversion.status === 'APPROVED')
    .reduce((sum, conversion) => sum + conversion.commissionAmount, 0);
  const commissionPaid = conversions
    .filter((conversion) => conversion.status === 'PAID')
    .reduce((sum, conversion) => sum + conversion.commissionAmount, 0);

  const productPerformance = await Promise.all(
    selections.map(async (selection) => {
      const revenue = await prisma.orderItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          productId: selection.productId,
          order: { affiliateUserId: user.id, createdAt: { gte: monthStart } },
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
        revenueThisMonth: revenue._sum.lineTotal ?? 0,
      };
    }),
  );

  return NextResponse.json({
    profile: { code: profile.code, isActive: profile.isActive },
    totalClicks,
    totalConversions: conversions.length,
    commissionPending,
    commissionPaid,
    productPerformance,
  });
});
