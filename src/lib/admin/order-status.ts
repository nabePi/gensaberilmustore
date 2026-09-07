import type { OrderStatus } from '@prisma/client';

import type { AdminBadgeTone } from '@/lib/admin/styles';

export const ORDER_STATUS_BADGE_TONE: Record<OrderStatus, AdminBadgeTone> = {
  AWAITING_PAYMENT: 'neutral',
  PAID: 'brand',
  PACKED: 'info',
  SHIPPED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
};
