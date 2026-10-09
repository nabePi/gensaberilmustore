import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { loadItemCommissions } from '@/server/affiliate/item-commission';
import { serializeCommissionRate } from '@/server/affiliate/serialize-rate';
import { withAuth } from '@/server/auth';

type RouteContext = { params: Promise<{ id: string }> };

const DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function dayKey(date: Date) {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

function commissionView(override: { percent: unknown; fixedAmount: number | null }) {
  return override.fixedAmount !== null
    ? { type: 'FIXED', value: override.fixedAmount }
    : { type: 'PERCENT', value: Number(override.percent) };
}

type ProductRow = {
  productId: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  finalPrice: number;
  isSelected: boolean;
  selectedAt: Date | null;
  commission: { type: string; value: number | null } | null;
  baseCommission: { type: string; value: number | null } | null;
  isCustomCommission: boolean;
  rateStatus: string | null;
  clicks: number;
  orders: number;
  completedOrders: number;
  unitsSold: number;
  salesValue: number;
  commissionPending: number;
  commissionEarned: number;
  commissionPaid: number;
};

export const GET = withAuth<RouteContext>(
  async (_request, { params }) => {
    const { id } = await params;

    const profile = await prisma.affiliateProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
        productSelections: { select: { productId: true, createdAt: true } },
        withdrawals: { orderBy: { requestedAt: 'desc' } },
        memberRates: true,
      },
    });
    if (!profile) {
      return NextResponse.json({ error: 'Afiliasi tidak ditemukan' }, { status: 404 });
    }

    const since = new Date(Date.now() - (DAYS - 1) * DAY_MS);
    since.setHours(0, 0, 0, 0);

    const [clickGroups, recentClicks, conversions, items] = await Promise.all([
      prisma.affiliateClick.groupBy({
        by: ['productId'],
        where: { affiliateProfileId: profile.id },
        _count: { _all: true },
      }),
      prisma.affiliateClick.findMany({
        where: { affiliateProfileId: profile.id, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.affiliateConversion.findMany({
        where: { affiliateProfileId: profile.id },
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true,
              total: true,
              status: true,
              createdAt: true,
              receiverName: true,
            },
          },
        },
      }),
      loadItemCommissions(prisma, { id: profile.id, userId: profile.userId }),
    ]);

    const totalClicks = clickGroups.reduce((sum, group) => sum + group._count._all, 0);
    const clicksByProduct = new Map(
      clickGroups.filter((g) => g.productId).map((g) => [g.productId as string, g._count._all]),
    );
    const overrideByProduct = new Map(profile.memberRates.map((o) => [o.productId, o]));
    const selectionByProduct = new Map(profile.productSelections.map((s) => [s.productId, s]));

    // Products: everything currently selected plus anything that already sold or got clicks.
    const productIds = new Set<string>([
      ...selectionByProduct.keys(),
      ...clicksByProduct.keys(),
      ...items.map((item) => item.productId),
    ]);
    const products = await prisma.product.findMany({
      where: { id: { in: [...productIds] } },
      select: {
        id: true,
        title: true,
        slug: true,
        finalPrice: true,
        commissionRate: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
          take: 1,
          select: { url: true },
        },
      },
    });

    const rows = new Map<string, ProductRow>();
    for (const product of products) {
      const serialized = product.commissionRate
        ? serializeCommissionRate(product.commissionRate)
        : null;
      rows.set(product.id, {
        productId: product.id,
        title: product.title,
        slug: product.slug,
        imageUrl: product.images[0]?.url ?? null,
        finalPrice: product.finalPrice,
        isSelected: selectionByProduct.has(product.id),
        selectedAt: selectionByProduct.get(product.id)?.createdAt ?? null,
        baseCommission: serialized && {
          type: serialized.commissionType,
          value: serialized.commissionValue,
        },
        isCustomCommission: overrideByProduct.has(product.id),
        commission: overrideByProduct.has(product.id)
          ? commissionView(overrideByProduct.get(product.id)!)
          : serialized && {
              type: serialized.commissionType,
              value: serialized.commissionValue,
            },
        rateStatus: serialized?.status ?? null,
        clicks: clicksByProduct.get(product.id) ?? 0,
        orders: 0,
        completedOrders: 0,
        unitsSold: 0,
        salesValue: 0,
        commissionPending: 0,
        commissionEarned: 0,
        commissionPaid: 0,
      });
    }

    const dailyMap = new Map<string, { clicks: number; orders: number }>();
    for (let i = 0; i < DAYS; i += 1) {
      dailyMap.set(dayKey(new Date(since.getTime() + i * DAY_MS)), { clicks: 0, orders: 0 });
    }
    for (const click of recentClicks) {
      const bucket = dailyMap.get(dayKey(click.createdAt));
      if (bucket) bucket.clicks += 1;
    }
    for (const conversion of conversions) {
      const bucket = dailyMap.get(dayKey(conversion.order.createdAt));
      if (bucket) bucket.orders += 1;
    }

    // Commission is the amount recorded on each order's conversion, not today's rate, so a rate
    // change only affects orders placed afterwards.
    for (const item of items) {
      const row = rows.get(item.productId);
      if (!row) continue;
      const status = item.conversionStatus;
      row.orders += 1;
      if (!status || status === 'REJECTED') continue;

      if (status === 'PENDING') row.commissionPending += item.commission;
      if (status === 'APPROVED' || status === 'PAID') {
        row.completedOrders += 1;
        row.unitsSold += item.quantity;
        row.salesValue += item.lineTotal;
      }
      if (status === 'APPROVED') row.commissionEarned += item.commission;
      if (status === 'PAID') row.commissionPaid += item.commission;
    }

    const sumConversions = (statuses: string[]) =>
      conversions
        .filter((c) => statuses.includes(c.status))
        .reduce((sum, c) => sum + c.commissionAmount, 0);
    const completedConversions = conversions.filter(
      (c) => c.status === 'APPROVED' || c.status === 'PAID',
    );
    const salesValue = completedConversions.reduce((sum, c) => sum + c.order.total, 0);

    const withdrawalSum = (statuses: string[]) =>
      profile.withdrawals
        .filter((w) => statuses.includes(w.status))
        .reduce((sum, w) => sum + w.amount, 0);
    const approvedCommission = sumConversions(['APPROVED']);
    const withdrawnAll = withdrawalSum(['REQUESTED', 'IN_PROGRESS', 'COMPLETED']);

    const productRows = [...rows.values()].sort(
      (a, b) => b.salesValue - a.salesValue || b.clicks - a.clicks,
    );

    return NextResponse.json({
      profile: {
        id: profile.id,
        code: profile.code,
        status: profile.status,
        isActive: profile.isActive,
        joinedAt: profile.joinedAt,
        bank: {
          name: profile.payoutBankName,
          account: profile.payoutBankAccount,
          holder: profile.payoutBankHolder,
        },
      },
      user: profile.user,
      totals: {
        clicks: totalClicks,
        conversions: conversions.length,
        completedOrders: completedConversions.length,
        cancelledOrders: conversions.filter((c) => c.order.status === 'CANCELLED').length,
        unitsSold: productRows.reduce((sum, row) => sum + row.unitsSold, 0),
        salesValue,
        selectedProducts: profile.productSelections.length,
      },
      commission: {
        pending: sumConversions(['PENDING']),
        earnedTotal: sumConversions(['APPROVED', 'PAID']),
        paidViaBatch: sumConversions(['PAID']),
        rejected: sumConversions(['REJECTED']),
        // What the member can still withdraw (matches the member's "Komisi Masuk").
        available: approvedCommission - withdrawnAll,
        withdrawalRequested: withdrawalSum(['REQUESTED']),
        withdrawalInProgress: withdrawalSum(['IN_PROGRESS']),
        withdrawalCompleted: withdrawalSum(['COMPLETED']),
      },
      products: productRows.map((row) => ({
        ...row,
        totalCommission: row.commissionEarned + row.commissionPaid,
      })),
      daily: [...dailyMap.entries()].map(([date, value]) => ({ date, ...value })),
      recentConversions: conversions.slice(0, 20).map((c) => ({
        id: c.id,
        orderNumber: c.order.orderNumber,
        buyerName: c.order.receiverName,
        orderTotal: c.order.total,
        orderStatus: c.order.status,
        commissionAmount: c.commissionAmount,
        status: c.status,
        createdAt: c.createdAt,
      })),
      withdrawals: profile.withdrawals.map((w) => ({
        id: w.id,
        amount: w.amount,
        status: w.status,
        requestedAt: w.requestedAt,
        completedAt: w.completedAt,
      })),
    });
  },
  { role: 'ADMIN' },
);
