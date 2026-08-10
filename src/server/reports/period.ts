import { z } from 'zod';

export const reportPeriodSchema = z.enum(['today', '7d', '30d', 'this_month', 'all_time']);
export type ReportPeriod = z.infer<typeof reportPeriodSchema>;

/** Non-cancelled statuses that represent realized/committed revenue. */
export const REVENUE_ORDER_STATUSES = ['PAID', 'PACKED', 'SHIPPED', 'COMPLETED'] as const;

export function resolvePeriodStart(period: ReportPeriod, now = new Date()): Date | null {
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'this_month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'all_time':
      return null;
  }
}
