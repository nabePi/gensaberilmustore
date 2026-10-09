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

export const listAdminAffiliateMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((value) => [10, 25, 50, 100].includes(value), 'limit harus 10, 25, 50, atau 100')
    .default(10),
  q: z.string().trim().min(1).optional(),
  status: z.enum(['PENDING', 'APPROVED']).optional(),
  active: z.enum(['true', 'false']).optional(),
  sort: z.enum(['joinedAt', 'name', 'email', 'code', 'status', 'isActive']).default('joinedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const updateAffiliateMemberSchema = z
  .object({
    status: z.literal('APPROVED').optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.status !== undefined || value.isActive !== undefined, {
    message: 'Tidak ada perubahan yang dikirim',
  });

const optionalDate = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.coerce.date({ invalid_type_error: 'Tanggal tidak valid' }).nullable(),
);

export const commissionRateUpsertSchema = z
  .object({
    commissionType: z.enum(['PERCENT', 'FIXED']).default('PERCENT'),
    commissionValue: z.number().min(0, 'Komisi minimal 0'),
    discountType: z.enum(['PERCENT', 'FIXED']).nullable().default(null),
    discountValue: z.number().min(0, 'Diskon minimal 0').nullable().default(null),
    startsAt: optionalDate.default(null),
    endsAt: optionalDate.default(null),
    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.commissionType === 'PERCENT' && value.commissionValue > 100) {
      ctx.addIssue({ code: 'custom', path: ['commissionValue'], message: 'Komisi maksimal 100%' });
    }
    if (value.commissionType === 'FIXED' && !Number.isInteger(value.commissionValue)) {
      ctx.addIssue({
        code: 'custom',
        path: ['commissionValue'],
        message: 'Komisi nominal harus bilangan bulat',
      });
    }
    if (value.discountType) {
      if (value.discountValue === null || value.discountValue <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['discountValue'],
          message: 'Nilai diskon wajib diisi',
        });
      } else if (value.discountType === 'PERCENT' && value.discountValue > 100) {
        ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'Diskon maksimal 100%' });
      } else if (value.discountType === 'FIXED' && !Number.isInteger(value.discountValue)) {
        ctx.addIssue({
          code: 'custom',
          path: ['discountValue'],
          message: 'Diskon nominal harus bilangan bulat',
        });
      }
    }
    if (value.startsAt && value.endsAt && value.startsAt > value.endsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'Tanggal selesai harus setelah tanggal mulai',
      });
    }
  });

export const listAdminCommissionRatesQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((value) => [10, 25, 50, 100].includes(value), 'limit harus 10, 25, 50, atau 100')
    .default(10),
});

export const listAffiliateCandidatesQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

export const bulkDeleteCommissionRatesSchema = z.object({
  productIds: z
    .array(z.string().uuid('ID produk tidak valid'))
    .min(1, 'Pilih minimal 1 produk')
    .max(100, 'Maksimal 100 produk sekaligus'),
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

export const memberCommissionSchema = z
  .object({
    commissionType: z.enum(['PERCENT', 'FIXED']),
    commissionValue: z.number().min(0, 'Komisi minimal 0'),
  })
  .superRefine((value, ctx) => {
    if (value.commissionType === 'PERCENT' && value.commissionValue > 100) {
      ctx.addIssue({ code: 'custom', path: ['commissionValue'], message: 'Komisi maksimal 100%' });
    }
    if (value.commissionType === 'FIXED' && !Number.isInteger(value.commissionValue)) {
      ctx.addIssue({
        code: 'custom',
        path: ['commissionValue'],
        message: 'Komisi nominal harus bilangan bulat',
      });
    }
  });
