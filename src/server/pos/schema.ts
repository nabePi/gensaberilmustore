import { z } from 'zod';

export const createPosTransactionSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid('productId tidak valid'),
        quantity: z.number().int().min(1, 'Kuantitas minimal 1'),
      }),
    )
    .min(1, 'Minimal 1 produk'),
  paymentMethod: z.enum(['POS_CASH', 'POS_GATEWAY'], {
    required_error: 'Metode pembayaran wajib diisi',
  }),
  customerName: z.string().trim().min(1).optional(),
  customerPhone: z.string().trim().min(1).optional(),
  note: z.string().trim().min(1).optional(),
  voucherCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase())
    .optional(),
  manualDiscount: z.number().int().min(0).default(0),
  manualDiscountReason: z.string().trim().min(1).optional(),
});

export const listPosTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  cashierId: z.string().uuid().optional(),
});
