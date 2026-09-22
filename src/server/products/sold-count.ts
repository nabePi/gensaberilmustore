import { prisma } from '@/lib/db';

export async function getSoldCounts(productIds: string[]): Promise<Record<string, number>> {
  if (productIds.length === 0) return {};

  const rows = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      productId: { in: productIds },
      order: { status: { not: 'CANCELLED' } },
    },
    _sum: { quantity: true },
  });

  return Object.fromEntries(
    rows
      .filter((row) => row.productId !== null)
      .map((row) => [row.productId as string, row._sum.quantity ?? 0]),
  );
}
