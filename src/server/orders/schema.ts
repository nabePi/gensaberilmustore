import { z } from 'zod';

export const ONLINE_PAYMENT_METHODS = ['BANK_TRANSFER', 'EWALLET', 'QRIS'] as const;
export const ORDER_STATUSES = [
  'AWAITING_PAYMENT',
  'PAID',
  'PACKED',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
] as const;

export const createOrderSchema = z
  .object({
    receiverName: z.string().trim().min(1, 'Nama penerima wajib diisi').optional(),
    receiverPhone: z.string().trim().min(1, 'Nomor telepon wajib diisi').optional(),
    receiverEmail: z.string().trim().email('Format email tidak valid').optional(),
    receiverAddress: z.string().trim().min(1, 'Alamat wajib diisi').optional(),
    cityId: z.string().uuid('Kota tidak valid').optional(),
    note: z.string().trim().max(500).optional(),
    useReceiverId: z.string().uuid('useReceiverId tidak valid').optional(),
    paymentMethod: z.enum(ONLINE_PAYMENT_METHODS, {
      required_error: 'Metode pembayaran wajib diisi',
    }),
    affiliateCode: z.string().trim().min(1).optional(),
    voucherCode: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) =>
      value.useReceiverId !== undefined ||
      (value.receiverName &&
        value.receiverPhone &&
        value.receiverEmail &&
        value.receiverAddress &&
        value.cityId),
    {
      message: 'Data penerima wajib diisi, atau gunakan useReceiverId',
      path: ['receiverName'],
    },
  );

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const listMemberOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  status: z.enum(ORDER_STATUSES).optional(),
});

export const listAdminOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).optional(),
  source: z.enum(['ONLINE', 'POS', 'ALL']).default('ALL'),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  affiliateCode: z.string().trim().min(1).optional(),
});
