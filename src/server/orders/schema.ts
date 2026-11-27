import { z } from 'zod';

import { sanitizeAddress } from '@/lib/address';
import { CHECKOUT_GROUPS } from '@/lib/checkout-groups';
import { isAllowedJneService } from '@/server/shipping/jne-tariff';

export const ONLINE_PAYMENT_METHODS = ['BANK_TRANSFER', 'EWALLET', 'QRIS'] as const;
export const SHIPPING_METHODS = ['JNE', 'SELF_PICKUP'] as const;
export const ORDER_STATUSES = [
  'AWAITING_PAYMENT',
  'PAID',
  'PACKED',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
] as const;

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const createOrderSchema = z
  .object({
    receiverName: z.string().trim().min(1, 'Nama penerima wajib diisi').optional(),
    receiverPhone: z.string().trim().min(1, 'Nomor telepon wajib diisi').optional(),
    receiverEmail: z.string().trim().email('Format email tidak valid').optional(),
    receiverAddress: z.preprocess(
      (value) => emptyToUndefined(typeof value === 'string' ? sanitizeAddress(value) : value),
      z.string().min(1, 'Alamat wajib diisi').optional(),
    ),
    destinationId: z.preprocess(
      emptyToUndefined,
      z.string().uuid('Tujuan pengiriman tidak valid').optional(),
    ),
    note: z.string().trim().max(500).optional(),
    checkoutGroup: z.enum(CHECKOUT_GROUPS).optional(),
    useReceiverId: z.string().uuid('useReceiverId tidak valid').optional(),
    shippingMethod: z.enum(SHIPPING_METHODS).default('JNE'),
    service: z
      .string()
      .refine(isAllowedJneService, 'Layanan pengiriman tidak valid')
      .default('REG'),
    paymentMethod: z.enum(ONLINE_PAYMENT_METHODS).default('BANK_TRANSFER'),
    affiliateCode: z.string().trim().min(1).optional(),
    voucherCode: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) =>
      value.useReceiverId !== undefined ||
      (value.receiverName &&
        value.receiverPhone &&
        (value.shippingMethod !== 'JNE' || (value.receiverAddress && value.destinationId))),
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

export const orderStatusUpdateSchema = z.object({
  toStatus: z.enum(ORDER_STATUSES, { required_error: 'Status tujuan wajib diisi' }),
  note: z.string().trim().max(500).optional(),
  generateAirwaybill: z.boolean().optional(),
});

export const bulkOrderStatusUpdateSchema = z.object({
  orderIds: z
    .array(z.string().uuid('ID order tidak valid'))
    .min(1, 'Minimal 1 order')
    .max(100, 'Maksimal 100 order sekaligus'),
  toStatus: z.enum(ORDER_STATUSES, { required_error: 'Status tujuan wajib diisi' }),
});

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Tanggal polos (YYYY-MM-DD) dari input date admin dihitung sebagai hari penuh WIB (UTC+7),
// bukan tengah malam UTC. Nilai ISO lengkap (mis. dari board) dipakai apa adanya.
function wibDateBoundary(edge: 'start' | 'end') {
  return z.preprocess((value) => {
    if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value)) {
      return `${value}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}+07:00`;
    }
    return value;
  }, z.coerce.date().optional());
}

export const listAdminOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).optional(),
  source: z.enum(['ONLINE', 'POS', 'ALL']).default('ALL'),
  dateFrom: wibDateBoundary('start'),
  dateTo: wibDateBoundary('end'),
  affiliateCode: z.string().trim().min(1).optional(),
});
