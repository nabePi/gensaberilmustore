import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';

const TOP_LIMIT = 10;

export const GET = withAuth(
  async () => {
    const [profiles, clickGroups, conversions, withdrawals] = await Promise.all([
      prisma.affiliateProfile.findMany({
        select: {
          id: true,
          code: true,
          isActive: true,
          status: true,
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.affiliateClick.groupBy({ by: ['affiliateProfileId'], _count: { _all: true } }),
      prisma.affiliateConversion.findMany({
        select: {
          affiliateProfileId: true,
          status: true,
          commissionAmount: true,
          order: { select: { total: true } },
        },
      }),
      prisma.affiliateWithdrawal.findMany({ select: { status: true, amount: true } }),
    ]);

    const clicksByProfile = new Map(
      clickGroups.map((group) => [group.affiliateProfileId, group._count._all]),
    );

    type Totals = {
      conversions: number;
      completedOrders: number;
      salesValue: number;
      commissionPending: number;
      commissionApproved: number;
      commissionPaid: number;
    };
    const emptyTotals = (): Totals => ({
      conversions: 0,
      completedOrders: 0,
      salesValue: 0,
      commissionPending: 0,
      commissionApproved: 0,
      commissionPaid: 0,
    });
    const byProfile = new Map<string, Totals>();
    const overall = emptyTotals();

    for (const conversion of conversions) {
      const totals = byProfile.get(conversion.affiliateProfileId) ?? emptyTotals();
      for (const target of [totals, overall]) {
        target.conversions += 1;
        if (conversion.status === 'PENDING')
          target.commissionPending += conversion.commissionAmount;
        if (conversion.status === 'APPROVED' || conversion.status === 'PAID') {
          target.completedOrders += 1;
          target.salesValue += conversion.order.total;
        }
        if (conversion.status === 'APPROVED')
          target.commissionApproved += conversion.commissionAmount;
        if (conversion.status === 'PAID') target.commissionPaid += conversion.commissionAmount;
      }
      byProfile.set(conversion.affiliateProfileId, totals);
    }

    const withdrawalSum = (statuses: string[]) =>
      withdrawals.filter((w) => statuses.includes(w.status)).reduce((s, w) => s + w.amount, 0);
    const withdrawalCount = (statuses: string[]) =>
      withdrawals.filter((w) => statuses.includes(w.status)).length;

    const ranked = profiles
      .map((profile) => {
        const totals = byProfile.get(profile.id) ?? emptyTotals();
        return {
          id: profile.id,
          code: profile.code,
          isActive: profile.isActive,
          status: profile.status,
          name: profile.user.name,
          email: profile.user.email,
          clicks: clicksByProfile.get(profile.id) ?? 0,
          completedOrders: totals.completedOrders,
          salesValue: totals.salesValue,
          // Everything earned from completed orders, whether or not it has been paid out yet.
          commissionEarned: totals.commissionApproved + totals.commissionPaid,
        };
      })
      .sort(
        (a, b) =>
          b.commissionEarned - a.commissionEarned ||
          b.salesValue - a.salesValue ||
          b.clicks - a.clicks,
      );

    return NextResponse.json({
      summary: {
        affiliates: profiles.length,
        activeAffiliates: profiles.filter((p) => p.status === 'APPROVED' && p.isActive).length,
        waitingApproval: profiles.filter((p) => p.status === 'PENDING').length,
        clicks: clickGroups.reduce((sum, group) => sum + group._count._all, 0),
        conversions: overall.conversions,
        completedOrders: overall.completedOrders,
        salesValue: overall.salesValue,
        commissionPending: overall.commissionPending,
        commissionEarned: overall.commissionApproved + overall.commissionPaid,
        withdrawalWaitingCount: withdrawalCount(['REQUESTED', 'IN_PROGRESS']),
        withdrawalWaitingAmount: withdrawalSum(['REQUESTED', 'IN_PROGRESS']),
        withdrawalCompletedAmount: withdrawalSum(['COMPLETED']),
      },
      top: ranked.slice(0, TOP_LIMIT),
    });
  },
  { role: 'ADMIN' },
);
