import type { OrderStatus } from '@prisma/client';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'Menunggu Pembayaran',
  PAID: 'Lunas',
  PACKED: 'Dikemas',
  SHIPPED: 'Dikirim',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export const ORDER_STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'bg-neutral-100 text-neutral-700',
  PAID: 'bg-brand-50 text-brand',
  PACKED: 'bg-brand-100 text-brand-700',
  SHIPPED: 'bg-brand-100 text-brand-700',
  COMPLETED: 'bg-green/10 text-green',
  CANCELLED: 'bg-red/10 text-red',
};

export function getOrderStatusLabel(
  status: OrderStatus,
  paymentClaimedAt?: string | Date | null,
): string {
  if (status === 'AWAITING_PAYMENT' && paymentClaimedAt) {
    return 'Pembayaran Sedang Dicek Admin';
  }
  return ORDER_STATUS_LABELS[status];
}

export function getOrderStatusBadgeClass(
  status: OrderStatus,
  paymentClaimedAt?: string | Date | null,
): string {
  if (status === 'AWAITING_PAYMENT' && paymentClaimedAt) {
    return 'bg-amber-100 text-amber-700';
  }
  return ORDER_STATUS_BADGE_CLASSES[status];
}

export const ORDER_STATUS_FILTER_TABS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'Semua', value: 'ALL' },
  { label: 'Menunggu Pembayaran', value: 'AWAITING_PAYMENT' },
  { label: 'Lunas', value: 'PAID' },
  { label: 'Dikemas', value: 'PACKED' },
  { label: 'Dikirim', value: 'SHIPPED' },
  { label: 'Selesai', value: 'COMPLETED' },
  { label: 'Dibatalkan', value: 'CANCELLED' },
];
