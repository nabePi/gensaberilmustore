import type { AffiliateConversionStatus, OrderStatus, Prisma } from '@prisma/client';

import { applyMemberRateOverride, computeItemCommission } from '@/server/affiliate/rate';

export type ItemCommission = {
  orderId: string;
  orderNumber: string;
  createdAt: Date;
  orderStatus: OrderStatus;
  conversionStatus: AffiliateConversionStatus | null;
  productId: string;
  quantity: number;
  lineTotal: number;
  /** Share of the commission recorded on the order's conversion; 0 when there is none. */
  commission: number;
};

/**
 * Splits `total` across `weights` so the parts add up to exactly `total`. The rounding
 * remainder goes to the heaviest line.
 */
export function splitByWeight(total: number, weights: number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);

  const parts = weights.map((weight) => Math.floor((total * weight) / sum));
  const remainder = total - parts.reduce((acc, part) => acc + part, 0);
  const heaviest = weights.indexOf(Math.max(...weights));
  parts[heaviest] = (parts[heaviest] ?? 0) + remainder;
  return parts;
}

/**
 * Per-product commission for every order that came through the affiliate's link.
 *
 * The amount comes from the commission recorded on the order's conversion, never from today's
 * rate, so changing a rate later does not rewrite history. A conversion is stored per order, so
 * for orders with several products it is split in proportion to what each line would earn.
 */
export async function loadItemCommissions(
  db: Prisma.TransactionClient,
  profile: { id: string; userId: string },
  options: { productId?: string } = {},
): Promise<ItemCommission[]> {
  const orders = await db.order.findMany({
    where: {
      affiliateUserId: profile.userId,
      ...(options.productId ? { items: { some: { productId: options.productId } } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      affiliateConversion: { select: { status: true, commissionAmount: true } },
      items: { select: { productId: true, quantity: true, lineTotal: true } },
    },
  });

  const productIds = [
    ...new Set(orders.flatMap((order) => order.items.map((item) => item.productId))),
  ].filter((productId): productId is string => productId !== null);

  const [rates, memberRates, storeSetting] = await Promise.all([
    db.affiliateCommissionRate.findMany({ where: { productId: { in: productIds } } }),
    db.affiliateMemberRate.findMany({ where: { affiliateProfileId: profile.id } }),
    db.storeSetting.findUnique({ where: { id: 1 } }),
  ]);
  const rateByProduct = new Map(rates.map((rate) => [rate.productId, rate]));
  const overrideByProduct = new Map(memberRates.map((rate) => [rate.productId, rate]));
  const defaultPercent = storeSetting ? Number(storeSetting.defaultCommissionPercent) : 0;

  const result: ItemCommission[] = [];
  for (const order of orders) {
    const conversion = order.affiliateConversion;
    const items = order.items.filter(
      (item): item is typeof item & { productId: string } => item.productId !== null,
    );

    const counts = conversion !== null && conversion.status !== 'REJECTED';
    let commissions = items.map(() => 0);
    if (counts) {
      const weights = items.map((item) =>
        computeItemCommission(
          applyMemberRateOverride(
            rateByProduct.get(item.productId) ?? null,
            overrideByProduct.get(item.productId),
          ),
          defaultPercent,
          item,
          order.createdAt,
        ),
      );
      // No line earns anything under today's rates (e.g. rate paused since): fall back to value.
      const usable = weights.some((weight) => weight > 0)
        ? weights
        : items.map((item) => item.lineTotal);
      commissions = splitByWeight(conversion.commissionAmount, usable);
    }

    items.forEach((item, index) => {
      if (options.productId && item.productId !== options.productId) return;
      result.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        orderStatus: order.status,
        conversionStatus: conversion?.status ?? null,
        productId: item.productId,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        commission: commissions[index] ?? 0,
      });
    });
  }
  return result;
}
