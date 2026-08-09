import { prisma } from '@/lib/db';

export type LaporanPeriod = 'all' | 'today' | 'week' | 'month';

const ORDER_STATUSES = [
  'AWAITING_PAYMENT',
  'PAID',
  'PACKED',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
] as const;

function getPeriodStart(period: LaporanPeriod): Date | null {
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === 'week') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

export async function getLaporanReport(period: LaporanPeriod) {
  const start = getPeriodStart(period);

  const orders = await prisma.order.findMany({
    where: start ? { createdAt: { gte: start } } : undefined,
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      items: {
        select: {
          quantity: true,
          lineTotal: true,
          titleSnapshot: true,
          productId: true,
        },
      },
    },
  });

  const nonCancelledOrders = orders.filter((order) => order.status !== 'CANCELLED');

  const totalOrders = orders.length;
  const revenue = nonCancelledOrders.reduce((sum, order) => sum + order.total, 0);
  const avgOrder = totalOrders > 0 ? Math.round(revenue / totalOrders) : 0;
  const completedCount = orders.filter((order) => order.status === 'COMPLETED').length;
  const completedRate = totalOrders > 0 ? completedCount / totalOrders : 0;

  const statusBreakdown = ORDER_STATUSES.map((status) => ({
    status,
    count: orders.filter((order) => order.status === status).length,
  }));

  const productSales = new Map<
    string,
    { productId: string | null; title: string; qty: number; revenue: number }
  >();
  for (const order of nonCancelledOrders) {
    for (const item of order.items) {
      const key = item.productId ?? item.titleSnapshot;
      const existing = productSales.get(key) ?? {
        productId: item.productId,
        title: item.titleSnapshot,
        qty: 0,
        revenue: 0,
      };
      existing.qty += item.quantity;
      existing.revenue += item.lineTotal;
      productSales.set(key, existing);
    }
  }
  const topProducts = [...productSales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const dailyCounts = new Map<string, number>();
  for (const order of orders) {
    const day = order.createdAt.toISOString().slice(0, 10);
    dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1);
  }
  const salesByDay = [...dailyCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    stats: { totalRevenue: revenue, totalOrders, avgOrder, completedRate },
    statusBreakdown,
    topProducts,
    salesByDay,
  };
}
