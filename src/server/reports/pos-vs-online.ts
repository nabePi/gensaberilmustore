import type { OrderSource } from '@prisma/client';

import { prisma } from '@/lib/db';
import { resolvePeriodStart } from '@/server/reports/period';
import type { ReportPeriod } from '@/server/reports/period';

export type PosVsOnline = Record<OrderSource, { orders: number; revenue: number }>;

export async function getPosVsOnline(period: ReportPeriod): Promise<PosVsOnline> {
  const start = resolvePeriodStart(period);

  const grouped = await prisma.order.groupBy({
    by: ['source'],
    where: {
      status: { not: 'CANCELLED' },
      ...(start ? { createdAt: { gte: start } } : {}),
    },
    _count: { _all: true },
    _sum: { total: true },
  });

  const result: PosVsOnline = {
    ONLINE: { orders: 0, revenue: 0 },
    POS: { orders: 0, revenue: 0 },
  };

  for (const row of grouped) {
    result[row.source] = { orders: row._count._all, revenue: row._sum.total ?? 0 };
  }

  return result;
}
