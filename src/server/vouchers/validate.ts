import type { Prisma, PrismaClient, Voucher, VoucherChannel } from '@prisma/client';

export type VoucherValidationReason =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'WRONG_CHANNEL'
  | 'MIN_PURCHASE_NOT_MET'
  | 'QUOTA_EXCEEDED'
  | 'USER_LIMIT_REACHED';

export type VoucherValidationResult =
  | { valid: true; voucher: Voucher; discountAmount: number }
  | { valid: false; reason: VoucherValidationReason };

type Db = PrismaClient | Prisma.TransactionClient;

export function computeVoucherDiscount(voucher: Voucher, subtotal: number): number {
  const rawDiscount =
    voucher.type === 'PERCENT' ? Math.floor((subtotal * voucher.value) / 100) : voucher.value;

  const cappedByMax =
    voucher.maxDiscount !== null ? Math.min(rawDiscount, voucher.maxDiscount) : rawDiscount;

  return Math.max(0, Math.min(cappedByMax, subtotal));
}

export async function validateVoucherCode(
  db: Db,
  code: string,
  {
    subtotal,
    channel,
    userId,
  }: {
    subtotal: number;
    channel: Exclude<VoucherChannel, 'ALL'>;
    userId: string | null;
  },
): Promise<VoucherValidationResult> {
  const voucher = await db.voucher.findUnique({ where: { code } });

  if (!voucher) {
    return { valid: false, reason: 'NOT_FOUND' };
  }
  if (!voucher.isActive) {
    return { valid: false, reason: 'INACTIVE' };
  }

  const now = new Date();
  if (voucher.startsAt && now < voucher.startsAt) {
    return { valid: false, reason: 'NOT_STARTED' };
  }
  if (voucher.expiresAt && now > voucher.expiresAt) {
    return { valid: false, reason: 'EXPIRED' };
  }
  if (voucher.channel !== 'ALL' && voucher.channel !== channel) {
    return { valid: false, reason: 'WRONG_CHANNEL' };
  }
  if (subtotal < voucher.minPurchase) {
    return { valid: false, reason: 'MIN_PURCHASE_NOT_MET' };
  }
  if (voucher.quota !== null && voucher.usedCount >= voucher.quota) {
    return { valid: false, reason: 'QUOTA_EXCEEDED' };
  }
  if (userId && voucher.perUserLimit !== null) {
    const redemptionCount = await db.voucherRedemption.count({
      where: { voucherId: voucher.id, userId },
    });
    if (redemptionCount >= voucher.perUserLimit) {
      return { valid: false, reason: 'USER_LIMIT_REACHED' };
    }
  }

  return { valid: true, voucher, discountAmount: computeVoucherDiscount(voucher, subtotal) };
}
