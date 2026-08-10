import { prisma } from '@/lib/db';
import { resolvePeriodStart } from '@/server/reports/period';
import type { ReportPeriod } from '@/server/reports/period';

export type RevenueByCategory = {
  categoryId: string | null;
  name: string;
  revenue: number;
  quantity: number;
};

const UNCATEGORIZED_NAME = 'Tanpa Kategori';

export async function getRevenueByCategory(period: ReportPeriod): Promise<RevenueByCategory[]> {
  const start = resolvePeriodStart(period);

  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        status: { not: 'CANCELLED' },
        ...(start ? { createdAt: { gte: start } } : {}),
      },
    },
    select: {
      quantity: true,
      lineTotal: true,
      product: {
        select: {
          categories: {
            take: 1,
            select: { category: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  const byCategory = new Map<string, RevenueByCategory>();
  for (const item of items) {
    const category = item.product?.categories[0]?.category;
    const key = category?.id ?? 'uncategorized';
    const entry = byCategory.get(key) ?? {
      categoryId: category?.id ?? null,
      name: category?.name ?? UNCATEGORIZED_NAME,
      revenue: 0,
      quantity: 0,
    };
    entry.revenue += item.lineTotal;
    entry.quantity += item.quantity;
    byCategory.set(key, entry);
  }

  return [...byCategory.values()].sort((a, b) => b.revenue - a.revenue);
}
