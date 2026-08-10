import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { REVENUE_ORDER_STATUSES, resolvePeriodStart } from '@/server/reports/period';
import type { ReportPeriod } from '@/server/reports/period';

const REVENUE_STATUSES = ['PAID', 'PACKED', 'SHIPPED', 'COMPLETED'] as const;

export type AdminSummary = {
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
  totalMembers: number;
  totalProducts: number;
};

export async function getAdminSummary(): Promise<AdminSummary> {
  const [totalOrders, pendingOrders, revenueAggregate, totalMembers, totalProducts] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'AWAITING_PAYMENT' } }),
      prisma.order.aggregate({
        where: { status: { in: [...REVENUE_STATUSES] } },
        _sum: { total: true },
      }),
      prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
      prisma.product.count({ where: { isActive: true } }),
    ]);

  return {
    totalOrders,
    pendingOrders,
    revenue: revenueAggregate._sum?.total ?? 0,
    totalMembers,
    totalProducts,
  };
}

export type ReportsSummary = {
  totalOrders: number;
  revenue: number;
  totalCustomers: number;
  totalProducts: number;
  totalPending: number;
};

async function computeReportsSummary(period: ReportPeriod): Promise<ReportsSummary> {
  const start = resolvePeriodStart(period);
  const periodWhere: Prisma.OrderWhereInput = start ? { createdAt: { gte: start } } : {};

  const [totalOrders, revenueAggregate, totalPending, customers, totalProducts] = await Promise.all(
    [
      prisma.order.count({ where: periodWhere }),
      prisma.order.aggregate({
        where: { ...periodWhere, status: { in: [...REVENUE_ORDER_STATUSES] } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { ...periodWhere, status: 'AWAITING_PAYMENT' } }),
      prisma.order.findMany({
        where: { ...periodWhere, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.product.count({ where: { isActive: true } }),
    ],
  );

  return {
    totalOrders,
    revenue: revenueAggregate._sum?.total ?? 0,
    totalCustomers: customers.length,
    totalProducts,
    totalPending,
  };
}

const SUMMARY_CACHE_TTL_MS = 60 * 1000;
const summaryCache = new Map<ReportPeriod, { value: ReportsSummary; expiresAt: number }>();

export async function getReportsSummary(period: ReportPeriod): Promise<ReportsSummary> {
  const cached = summaryCache.get(period);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await computeReportsSummary(period);
  summaryCache.set(period, { value, expiresAt: Date.now() + SUMMARY_CACHE_TTL_MS });
  return value;
}
