import { prisma } from '@/lib/db';
import { REVENUE_ORDER_STATUSES, resolvePeriodStart } from '@/server/reports/period';
import type { ReportPeriod } from '@/server/reports/period';

export type TopProduct = {
  productId: string;
  title: string;
  quantity: number;
  revenue: number;
};

export type TopProductsResult = {
  items: TopProduct[];
  totalQuantity: number;
  totalRevenue: number;
};

export async function getTopProducts(
  period: ReportPeriod,
  limit: number,
): Promise<TopProductsResult> {
  const start = resolvePeriodStart(period);

  const grouped = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      productId: { not: null },
      order: {
        status: { in: [...REVENUE_ORDER_STATUSES] },
        ...(start ? { createdAt: { gte: start } } : {}),
      },
    },
    _sum: { quantity: true, lineTotal: true },
  });

  const rows = grouped as Array<(typeof grouped)[number] & { productId: string }>;

  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((row) => row.productId) } },
    select: { id: true, title: true },
  });
  const titleById = new Map(products.map((product) => [product.id, product.title]));

  const items = rows
    .map((row) => ({
      productId: row.productId,
      title: titleById.get(row.productId) ?? 'Produk tidak ditemukan',
      quantity: row._sum.quantity ?? 0,
      revenue: row._sum.lineTotal ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  const totalQuantity = rows.reduce((sum, row) => sum + (row._sum.quantity ?? 0), 0);
  const totalRevenue = rows.reduce((sum, row) => sum + (row._sum.lineTotal ?? 0), 0);

  return { items, totalQuantity, totalRevenue };
}
