import type { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export type AffiliateRateWindow = {
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

export type AffiliateRateDiscount = {
  discountType: 'PERCENT' | 'FIXED' | null;
  discountPercent: Prisma.Decimal | number | null;
  discountAmount: number | null;
};

export type AffiliateRateStatus = 'ACTIVE' | 'INACTIVE' | 'SCHEDULED' | 'EXPIRED';

export function getAffiliateRateStatus(
  rate: AffiliateRateWindow,
  now: Date = new Date(),
): AffiliateRateStatus {
  if (!rate.isActive) return 'INACTIVE';
  if (rate.startsAt && rate.startsAt > now) return 'SCHEDULED';
  if (rate.endsAt && rate.endsAt < now) return 'EXPIRED';
  return 'ACTIVE';
}

/** Prisma filter matching rates that are active and inside their period right now. */
export function runningAffiliateRateWhere(
  now: Date = new Date(),
): Prisma.AffiliateCommissionRateWhereInput {
  return {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
}

/** Products an affiliate may promote: active, shown on the website, with a running rate. */
export function promotableProductWhere(now: Date = new Date()): Prisma.ProductWhereInput {
  return {
    isActive: true,
    channel: { in: ['WEB', 'BOTH'] },
    commissionRate: { is: runningAffiliateRateWhere(now) },
  };
}

export function isAffiliateRateRunning(rate: AffiliateRateWindow, now: Date = new Date()) {
  return getAffiliateRateStatus(rate, now) === 'ACTIVE';
}

/** Discount for one order line. Fixed amounts apply per unit and never exceed the line total. */
export function computeLineAffiliateDiscount(
  rate: AffiliateRateDiscount,
  line: { quantity: number; lineTotal: number },
): number {
  if (rate.discountType === 'PERCENT' && rate.discountPercent !== null) {
    return Math.floor((line.lineTotal * Number(rate.discountPercent)) / 100);
  }
  if (rate.discountType === 'FIXED' && rate.discountAmount !== null) {
    return Math.min(rate.discountAmount * line.quantity, line.lineTotal);
  }
  return 0;
}

export type AffiliateDiscountLine = {
  productId: string | null;
  quantity: number;
  lineTotal: number;
};

/**
 * Total discount a buyer gets for shopping through an affiliate link. Only approved + active
 * affiliates grant a discount, and only for products whose affiliate rate is currently running.
 */
export async function computeAffiliateDiscount(
  db: Db,
  affiliateCode: string | null | undefined,
  lines: AffiliateDiscountLine[],
  now: Date = new Date(),
): Promise<number> {
  if (!affiliateCode) return 0;

  const profile = await db.affiliateProfile.findUnique({
    where: { code: affiliateCode },
    select: { isActive: true, status: true },
  });
  if (!profile || !profile.isActive || profile.status !== 'APPROVED') return 0;

  const productIds = lines
    .map((line) => line.productId)
    .filter((productId): productId is string => productId !== null);
  if (productIds.length === 0) return 0;

  const rates = await db.affiliateCommissionRate.findMany({
    where: { productId: { in: productIds }, discountType: { not: null } },
  });
  const rateByProductId = new Map(rates.map((rate) => [rate.productId, rate]));

  let total = 0;
  for (const line of lines) {
    if (!line.productId) continue;
    const rate = rateByProductId.get(line.productId);
    if (!rate || !isAffiliateRateRunning(rate, now)) continue;
    total += computeLineAffiliateDiscount(rate, line);
  }
  return total;
}

type CommissionRateLike = AffiliateRateWindow & {
  percent: Prisma.Decimal | number;
  fixedAmount: number | null;
};

/**
 * Commission for one order line. A product without an affiliate rate falls back to the store
 * default percent; a rate that was paused or outside its period at order time earns nothing.
 */
export function computeItemCommission(
  rate: CommissionRateLike | null,
  defaultPercent: number,
  line: { quantity: number; lineTotal: number },
  orderedAt: Date,
): number {
  if (rate) {
    if (!isAffiliateRateRunning(rate, orderedAt)) return 0;
    return rate.fixedAmount !== null
      ? rate.fixedAmount * line.quantity
      : Math.floor((line.lineTotal * Number(rate.percent)) / 100);
  }
  return defaultPercent > 0 ? Math.floor((line.lineTotal * defaultPercent) / 100) : 0;
}

export type MemberRateOverride = {
  percent: Prisma.Decimal | number | null;
  fixedAmount: number | null;
};

/**
 * A member-specific commission replaces only the commission value of the product rate. The
 * period and on/off switch still come from the product rate, so pausing a product pauses
 * everyone. Without a product rate the override applies as an always-on rate.
 */
export function applyMemberRateOverride<R extends CommissionRateLike>(
  rate: R | null,
  override: MemberRateOverride | null | undefined,
): CommissionRateLike | R | null {
  if (!override) return rate;
  return {
    isActive: rate?.isActive ?? true,
    startsAt: rate?.startsAt ?? null,
    endsAt: rate?.endsAt ?? null,
    percent: override.percent ?? 0,
    fixedAmount: override.fixedAmount,
  };
}
