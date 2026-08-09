import type { OrderSource, PaymentMethod } from '@prisma/client';

import { prisma } from '@/lib/db';

export type LaporanLengkapFilter = {
  year?: number;
  month?: number;
  source?: OrderSource;
};

export async function getLaporanLengkap(filter: LaporanLengkapFilter) {
  const orders = await prisma.order.findMany({
    where: {
      status: { not: 'CANCELLED' },
      source: filter.source,
    },
    select: {
      total: true,
      source: true,
      paymentMethod: true,
      createdAt: true,
      items: {
        select: {
          quantity: true,
          lineTotal: true,
          titleSnapshot: true,
          productId: true,
          product: {
            select: {
              categories: {
                take: 1,
                select: { category: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });

  const filteredOrders = orders.filter((order) => {
    if (filter.year && order.createdAt.getFullYear() !== filter.year) return false;
    if (filter.month && order.createdAt.getMonth() + 1 !== filter.month) return false;
    return true;
  });

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = filteredOrders.length;
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const totalItems = filteredOrders.reduce(
    (sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0),
    0,
  );

  const monthly = new Map<
    string,
    { year: number; month: number; revenue: number; orders: number }
  >();
  const sourceComparison: Record<OrderSource, { orders: number; revenue: number }> = {
    ONLINE: { orders: 0, revenue: 0 },
    POS: { orders: 0, revenue: 0 },
  };
  const categoryRevenue = new Map<string, { name: string; revenue: number; qty: number }>();
  const paymentMethods = new Map<
    PaymentMethod,
    { method: PaymentMethod; count: number; revenue: number }
  >();
  const productSales = new Map<string, { title: string; qty: number; revenue: number }>();

  for (const order of filteredOrders) {
    const year = order.createdAt.getFullYear();
    const month = order.createdAt.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const monthEntry = monthly.get(monthKey) ?? { year, month, revenue: 0, orders: 0 };
    monthEntry.revenue += order.total;
    monthEntry.orders += 1;
    monthly.set(monthKey, monthEntry);

    sourceComparison[order.source].orders += 1;
    sourceComparison[order.source].revenue += order.total;

    const paymentEntry = paymentMethods.get(order.paymentMethod) ?? {
      method: order.paymentMethod,
      count: 0,
      revenue: 0,
    };
    paymentEntry.count += 1;
    paymentEntry.revenue += order.total;
    paymentMethods.set(order.paymentMethod, paymentEntry);

    for (const item of order.items) {
      const categoryName = item.product?.categories[0]?.category.name ?? 'Tanpa Kategori';
      const categoryEntry = categoryRevenue.get(categoryName) ?? {
        name: categoryName,
        revenue: 0,
        qty: 0,
      };
      categoryEntry.revenue += item.lineTotal;
      categoryEntry.qty += item.quantity;
      categoryRevenue.set(categoryName, categoryEntry);

      const productKey = item.productId ?? item.titleSnapshot;
      const productEntry = productSales.get(productKey) ?? {
        title: item.titleSnapshot,
        qty: 0,
        revenue: 0,
      };
      productEntry.qty += item.quantity;
      productEntry.revenue += item.lineTotal;
      productSales.set(productKey, productEntry);
    }
  }

  return {
    stats: { totalRevenue, totalOrders, avgOrder, totalItems },
    revenueByMonth: [...monthly.values()].sort((a, b) =>
      a.year === b.year ? a.month - b.month : a.year - b.year,
    ),
    sourceComparison,
    categoryRevenue: [...categoryRevenue.values()].sort((a, b) => b.revenue - a.revenue),
    paymentMethods: [...paymentMethods.values()].sort((a, b) => b.revenue - a.revenue),
    topProducts: [...productSales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
  };
}
