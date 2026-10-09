import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { loadItemCommissions } from '@/server/affiliate/item-commission';
import { applyMemberRateOverride } from '@/server/affiliate/rate';
import { summarizeConversions } from '@/server/affiliate/stats';
import { withAuth } from '@/server/auth';

export const GET = withAuth(async (_request, { user }) => {
  const profile = await prisma.affiliateProfile.findUnique({ where: { userId: user.id } });

  if (!profile) {
    return NextResponse.json({ error: 'Anda belum menjadi afiliasi' }, { status: 404 });
  }

  const [totalClicks, conversions, selections, withdrawals, memberRates] = await Promise.all([
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
            commissionRate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.affiliateWithdrawal.findMany({
      where: { affiliateProfileId: profile.id },
      select: { status: true, amount: true },
    }),
    prisma.affiliateMemberRate.findMany({ where: { affiliateProfileId: profile.id } }),
  ]);
  const overrideByProduct = new Map(memberRates.map((override) => [override.productId, override]));

  const summary = summarizeConversions(conversions, withdrawals);

  const itemCommissions = await loadItemCommissions(prisma, { id: profile.id, userId: user.id });

  const productPerformance = selections.map((selection) => {
    // Same rule as "Order Selesai": only completed orders count, never cancelled ones.
    // Commission is what was recorded on each order, so a rate change only affects new orders.
    const done = itemCommissions.filter(
      (item) =>
        item.productId === selection.productId &&
        (item.conversionStatus === 'APPROVED' || item.conversionStatus === 'PAID'),
    );
    const rate = applyMemberRateOverride(
      selection.product.commissionRate,
      overrideByProduct.get(selection.productId),
    );

    return {
      productId: selection.productId,
      title: selection.product.title,
      slug: selection.product.slug,
      commissionRate: rate
        ? { percent: Number(rate.percent), fixedAmount: rate.fixedAmount, isActive: rate.isActive }
        : null,
      totalRevenue: done.reduce((sum, item) => sum + item.lineTotal, 0),
      totalCommission: done.reduce((sum, item) => sum + item.commission, 0),
    };
  });

  return NextResponse.json({
    profile: { code: profile.code, isActive: profile.isActive, status: profile.status },
    totalClicks,
    ...summary,
    productPerformance,
  });
});
