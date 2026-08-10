import type { OrderSource } from '@prisma/client';

import { prisma } from '@/lib/db';

export type RevenueByMonth = {
  month: number;
  revenue: number;
  orders: number;
};

export async function getRevenueByMonth(
  year: number,
  source?: OrderSource,
): Promise<RevenueByMonth[]> {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const orders = await prisma.order.findMany({
    where: {
      status: { not: 'CANCELLED' },
      createdAt: { gte: start, lt: end },
      ...(source ? { source } : {}),
    },
    select: { createdAt: true, total: true },
  });

  const rows: RevenueByMonth[] = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    revenue: 0,
    orders: 0,
  }));

  for (const order of orders) {
    const row = rows.find((entry) => entry.month === order.createdAt.getMonth() + 1);
    if (!row) continue;
    row.revenue += order.total;
    row.orders += 1;
  }

  return rows;
}
