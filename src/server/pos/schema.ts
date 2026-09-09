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
  paymentMethod: z.enum(['POS_CASH', 'POS_GATEWAY', 'POS_QRIS'], {
    required_error: 'Metode pembayaran wajib diisi',
  }),
  customerName: z.string().trim().min(1, 'Nama pelanggan wajib diisi'),
  customerPhone: z
    .string()
    .trim()
    .min(1, 'Nomor telepon wajib diisi')
    .refine((value) => {
      const digits = value.replace(/\D/g, '').replace(/^0+/, '');
      return digits.length >= 8 && digits.length <= 13;
    }, 'Nomor telepon tidak valid'),
  customerEmail: z.string().trim().min(1, 'Email pelanggan wajib diisi').email('Email tidak valid'),
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
