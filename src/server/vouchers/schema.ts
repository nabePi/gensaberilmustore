import { z } from 'zod';

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
