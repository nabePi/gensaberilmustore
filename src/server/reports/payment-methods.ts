import type { PaymentMethod } from '@prisma/client';

import { prisma } from '@/lib/db';
import { resolvePeriodStart } from '@/server/reports/period';
import type { ReportPeriod } from '@/server/reports/period';

export type PaymentMethodBreakdown = {
  method: PaymentMethod;
  count: number;
  revenue: number;
};

export async function getPaymentMethods(period: ReportPeriod): Promise<PaymentMethodBreakdown[]> {
  const start = resolvePeriodStart(period);

  const grouped = await prisma.order.groupBy({
    by: ['paymentMethod'],
    where: {
      status: { not: 'CANCELLED' },
      ...(start ? { createdAt: { gte: start } } : {}),
    },
    _count: { _all: true },
    _sum: { total: true },
  });

  return grouped
    .map((row) => ({
      method: row.paymentMethod,
      count: row._count._all,
      revenue: row._sum.total ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}
