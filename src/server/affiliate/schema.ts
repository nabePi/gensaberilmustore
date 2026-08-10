import { z } from 'zod';

export const affiliateJoinSchema = z.object({
  payoutBankName: z.string().trim().min(1, 'Nama bank wajib diisi'),
  payoutBankAccount: z.string().trim().min(1, 'Nomor rekening wajib diisi'),
  payoutBankHolder: z.string().trim().min(1, 'Nama pemilik rekening wajib diisi'),
});

export const affiliateProductSelectionSchema = z.object({
  productIds: z.array(z.string().uuid('ID produk tidak valid')),
});

export const listAdminAffiliatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  q: z.string().trim().min(1).optional(),
});

export const commissionRateUpsertSchema = z.object({
  percent: z.number().min(0, 'Persentase minimal 0').max(100, 'Persentase maksimal 100'),
  fixedAmount: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const listAdminPayoutsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']).optional(),
  affiliateProfileId: z.string().uuid().optional(),
});

export const createPayoutBatchSchema = z
  .object({
    affiliateProfileId: z.string().uuid('affiliateProfileId tidak valid'),
    periodStart: z.coerce.date({ invalid_type_error: 'periodStart tidak valid' }),
    periodEnd: z.coerce.date({ invalid_type_error: 'periodEnd tidak valid' }),
  })
  .refine((value) => value.periodStart <= value.periodEnd, {
    message: 'periodStart harus sebelum atau sama dengan periodEnd',
    path: ['periodStart'],
  });
