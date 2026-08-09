import { z } from 'zod';

const voucherFields = {
  code: z
    .string()
    .trim()
    .min(1, 'Kode wajib diisi')
    .max(30, 'Kode maksimal 30 karakter')
    .transform((value) => value.toUpperCase()),
  description: z.string().trim().max(500).optional().nullable(),
  type: z.enum(['PERCENT', 'FIXED'], { required_error: 'Tipe wajib diisi' }),
  value: z.number().int('Nilai harus bilangan bulat').positive('Nilai harus lebih dari 0'),
  maxDiscount: z.number().int().positive().nullable().optional(),
  minPurchase: z.number().int().min(0).default(0),
  channel: z.enum(['ALL', 'ONLINE', 'POS']).default('ALL'),
  quota: z.number().int().positive().nullable().optional(),
  perUserLimit: z.number().int().positive().nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().default(true),
};

export const createVoucherSchema = z.object(voucherFields);
export const updateVoucherSchema = z.object(voucherFields).partial();

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
export type UpdateVoucherInput = z.infer<typeof updateVoucherSchema>;

export const listAdminVouchersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  q: z.string().trim().min(1).optional(),
  channel: z.enum(['ALL', 'ONLINE', 'POS']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export const voucherValidateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Kode voucher wajib diisi')
    .transform((value) => value.toUpperCase()),
  subtotal: z.number().int().min(0, 'Subtotal tidak valid'),
  channel: z.enum(['ONLINE', 'POS'], { required_error: 'Channel wajib diisi' }),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('productId tidak valid'),
        quantity: z.number().int().min(1),
      }),
    )
    .optional(),
});
