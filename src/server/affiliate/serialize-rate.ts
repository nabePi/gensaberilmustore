import type { AffiliateCommissionRate } from '@prisma/client';

import { getAffiliateRateStatus } from '@/server/affiliate/rate';

export function serializeCommissionRate(rate: AffiliateCommissionRate) {
  const commissionType = rate.fixedAmount !== null ? 'FIXED' : 'PERCENT';
  const discountType = rate.discountType;

  return {
    productId: rate.productId,
    commissionType,
    commissionValue: commissionType === 'FIXED' ? rate.fixedAmount : Number(rate.percent),
    discountType,
    discountValue:
      discountType === 'FIXED'
        ? rate.discountAmount
        : discountType === 'PERCENT'
          ? Number(rate.discountPercent)
          : null,
    startsAt: rate.startsAt,
    endsAt: rate.endsAt,
    isActive: rate.isActive,
    status: getAffiliateRateStatus(rate),
    updatedAt: rate.updatedAt,
  };
}
