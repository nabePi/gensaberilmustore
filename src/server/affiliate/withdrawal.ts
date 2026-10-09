import type { Prisma } from '@prisma/client';
import { z } from 'zod';

export const MIN_WITHDRAWAL_AMOUNT = 50_000;

export const createWithdrawalSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Jumlah harus berupa angka' })
    .int('Jumlah harus bilangan bulat')
    .min(MIN_WITHDRAWAL_AMOUNT, 'Pencairan minimal Rp50.000'),
});

/**
 * Saldo yang bisa dicairkan = komisi masuk (konversi APPROVED) dikurangi semua pengajuan
 * pencairan, termasuk yang sudah selesai, karena konversinya tetap APPROVED.
 */
export async function getWithdrawableBalance(
  db: Prisma.TransactionClient,
  affiliateProfileId: string,
) {
  const [earned, withdrawn] = await Promise.all([
    db.affiliateConversion.aggregate({
      _sum: { commissionAmount: true },
      where: { affiliateProfileId, status: 'APPROVED' },
    }),
    db.affiliateWithdrawal.aggregate({
      _sum: { amount: true },
      where: { affiliateProfileId },
    }),
  ]);
  return (earned._sum.commissionAmount ?? 0) - (withdrawn._sum.amount ?? 0);
}

export const listAdminWithdrawalsQuerySchema = z.object({
  status: z.enum(['REQUESTED', 'IN_PROGRESS', 'COMPLETED']).optional(),
});

export const updateWithdrawalStatusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED']),
});

/** Withdrawals only move forward: REQUESTED → IN_PROGRESS → COMPLETED. */
export const NEXT_WITHDRAWAL_STATUS = {
  REQUESTED: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
} as const;
