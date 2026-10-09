import type { AffiliateConversionStatus, AffiliateWithdrawalStatus } from '@prisma/client';

type ConversionLike = { status: AffiliateConversionStatus; commissionAmount: number };
type WithdrawalLike = { status: AffiliateWithdrawalStatus; amount: number };

/**
 * A conversion is APPROVED only once its order is COMPLETED (a paid order can still be
 * cancelled), so commission counts as earned from that point. PAID means it was already
 * paid out, so it is reported separately to avoid counting it twice.
 *
 * Withdrawals leave the conversions APPROVED, so they are applied here: every requested amount
 * comes out of "earned" right away (it is reserved), and only COMPLETED ones count as "paid".
 */
export function summarizeConversions(
  conversions: ConversionLike[],
  withdrawals: WithdrawalLike[] = [],
) {
  const sumBy = (statuses: AffiliateConversionStatus[]) =>
    conversions
      .filter((conversion) => statuses.includes(conversion.status))
      .reduce((sum, conversion) => sum + conversion.commissionAmount, 0);

  const withdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
  const withdrawnCompleted = withdrawals
    .filter((w) => w.status === 'COMPLETED')
    .reduce((sum, w) => sum + w.amount, 0);

  return {
    totalConversions: conversions.length,
    completedOrders: conversions.filter(
      (conversion) => conversion.status === 'APPROVED' || conversion.status === 'PAID',
    ).length,
    commissionEarned: sumBy(['APPROVED']) - withdrawn,
    commissionPaid: sumBy(['PAID']) + withdrawnCompleted,
  };
}
