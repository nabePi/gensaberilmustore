import type { AffiliateConversionStatus } from '@prisma/client';

type ConversionLike = { status: AffiliateConversionStatus; commissionAmount: number };

/**
 * A conversion is APPROVED only once its order is COMPLETED (a paid order can still be
 * cancelled), so commission counts as earned from that point. PAID means it was already
 * paid out, so it is reported separately to avoid counting it twice.
 */
export function summarizeConversions(conversions: ConversionLike[]) {
  const sumBy = (statuses: AffiliateConversionStatus[]) =>
    conversions
      .filter((conversion) => statuses.includes(conversion.status))
      .reduce((sum, conversion) => sum + conversion.commissionAmount, 0);

  return {
    totalConversions: conversions.length,
    completedOrders: conversions.filter(
      (conversion) => conversion.status === 'APPROVED' || conversion.status === 'PAID',
    ).length,
    commissionEarned: sumBy(['APPROVED']),
    commissionPaid: sumBy(['PAID']),
  };
}
