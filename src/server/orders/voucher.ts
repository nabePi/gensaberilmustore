import type { Prisma, PrismaClient, Voucher } from '@prisma/client';

import { validateVoucherCode, type VoucherValidationReason } from '@/server/vouchers/validate';

export class VoucherValidationError extends Error {}

export type VoucherValidationResult = {
  voucher: Voucher;
  discountAmount: number;
};

type Db = PrismaClient | Prisma.TransactionClient;

const REASON_MESSAGES: Record<VoucherValidationReason, string> = {
  NOT_FOUND: 'Voucher tidak ditemukan atau tidak aktif',
  INACTIVE: 'Voucher tidak ditemukan atau tidak aktif',
  NOT_STARTED: 'Voucher belum berlaku',
  EXPIRED: 'Voucher sudah kedaluwarsa',
  WRONG_CHANNEL: 'Voucher tidak berlaku untuk channel ini',
  MIN_PURCHASE_NOT_MET: 'Belanja belum mencapai minimum pembelian voucher',
  QUOTA_EXCEEDED: 'Kuota voucher sudah habis',
  USER_LIMIT_REACHED: 'Voucher sudah mencapai batas penggunaan Anda',
};

export async function validateVoucherForOrder(
  db: Db,
  code: string,
  { subtotal, userId }: { subtotal: number; userId: string | null },
): Promise<VoucherValidationResult> {
  const result = await validateVoucherCode(db, code, { subtotal, channel: 'ONLINE', userId });

  if (!result.valid) {
    throw new VoucherValidationError(REASON_MESSAGES[result.reason]);
  }

  return { voucher: result.voucher, discountAmount: result.discountAmount };
}
