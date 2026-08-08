import type { Prisma, PrismaClient, Voucher } from '@prisma/client';

export class VoucherValidationError extends Error {}

export type VoucherValidationResult = {
  voucher: Voucher;
  discountAmount: number;
};

type Db = PrismaClient | Prisma.TransactionClient;

function computeDiscountAmount(voucher: Voucher, subtotal: number): number {
  const rawDiscount =
    voucher.type === 'PERCENT' ? Math.floor((subtotal * voucher.value) / 100) : voucher.value;

  const cappedByMax =
    voucher.maxDiscount !== null ? Math.min(rawDiscount, voucher.maxDiscount) : rawDiscount;

  return Math.max(0, Math.min(cappedByMax, subtotal));
}

export async function validateVoucherForOrder(
  db: Db,
  code: string,
  { subtotal, userId }: { subtotal: number; userId: string | null },
): Promise<VoucherValidationResult> {
  const voucher = await db.voucher.findUnique({ where: { code } });

  if (!voucher || !voucher.isActive) {
    throw new VoucherValidationError('Voucher tidak ditemukan atau tidak aktif');
  }

  if (voucher.channel !== 'ALL' && voucher.channel !== 'ONLINE') {
    throw new VoucherValidationError('Voucher tidak berlaku untuk channel ini');
  }

  const now = new Date();
  if (voucher.startsAt && now < voucher.startsAt) {
    throw new VoucherValidationError('Voucher belum berlaku');
  }
  if (voucher.expiresAt && now > voucher.expiresAt) {
    throw new VoucherValidationError('Voucher sudah kedaluwarsa');
  }

  if (subtotal < voucher.minPurchase) {
    throw new VoucherValidationError('Belanja belum mencapai minimum pembelian voucher');
  }

  if (voucher.quota !== null && voucher.usedCount >= voucher.quota) {
    throw new VoucherValidationError('Kuota voucher sudah habis');
  }

  if (userId && voucher.perUserLimit !== null) {
    const redemptionCount = await db.voucherRedemption.count({
      where: { voucherId: voucher.id, userId },
    });
    if (redemptionCount >= voucher.perUserLimit) {
      throw new VoucherValidationError('Voucher sudah mencapai batas penggunaan Anda');
    }
  }

  return { voucher, discountAmount: computeDiscountAmount(voucher, subtotal) };
}
