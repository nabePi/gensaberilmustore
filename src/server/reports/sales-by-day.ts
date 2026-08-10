import { prisma } from '@/lib/db';
import { resolvePeriodStart } from '@/server/reports/period';
import type { ReportPeriod } from '@/server/reports/period';

export type SalesByDay = {
  date: string;
  orders: number;
  revenue: number;
};

export async function getSalesByDay(period: ReportPeriod): Promise<SalesByDay[]> {
  const start = resolvePeriodStart(period);

  const orders = await prisma.order.findMany({
    where: {
      status: { not: 'CANCELLED' },
      ...(start ? { createdAt: { gte: start } } : {}),
    },
    select: { createdAt: true, total: true },
  });

  const byDay = new Map<string, SalesByDay>();
  for (const order of orders) {
    const date = order.createdAt.toISOString().slice(0, 10);
    const entry = byDay.get(date) ?? { date, orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += order.total;
    byDay.set(date, entry);
  }

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}
