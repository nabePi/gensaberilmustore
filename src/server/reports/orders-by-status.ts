import type { OrderSource } from '@prisma/client';

import { prisma } from '@/lib/db';
import { resolvePeriodStart } from '@/server/reports/period';
import type { ReportPeriod } from '@/server/reports/period';

const ORDER_STATUSES = [
  'AWAITING_PAYMENT',
  'PAID',
  'PACKED',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type OrdersByStatus = Record<(typeof ORDER_STATUSES)[number], number>;

export async function getOrdersByStatus(
  period: ReportPeriod,
  source: OrderSource | 'ALL',
): Promise<OrdersByStatus> {
  const start = resolvePeriodStart(period);

  const grouped = await prisma.order.groupBy({
    by: ['status'],
    where: {
      ...(start ? { createdAt: { gte: start } } : {}),
      ...(source === 'ALL' ? {} : { source }),
    },
    _count: { _all: true },
  });

  const result = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as OrdersByStatus;

  for (const row of grouped) {
    result[row.status] = row._count._all;
  }

  return result;
}
