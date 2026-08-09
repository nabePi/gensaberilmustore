import { prisma } from '@/lib/db';

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
