import { describe, expect, it } from 'vitest';

import { listAdminOrdersQuerySchema } from '@/server/orders/schema';

describe('listAdminOrdersQuerySchema date filters', () => {
  it('treats a plain dateFrom as the start of the day in WIB', () => {
    const parsed = listAdminOrdersQuerySchema.parse({ dateFrom: '2026-11-26' });
    expect(parsed.dateFrom?.toISOString()).toBe('2026-11-25T17:00:00.000Z');
  });

  it('treats a plain dateTo as the end of the day in WIB', () => {
    const parsed = listAdminOrdersQuerySchema.parse({ dateTo: '2026-11-27' });
    expect(parsed.dateTo?.toISOString()).toBe('2026-11-27T16:59:59.999Z');
  });

  it('includes an order placed at 00:36 WIB on the first day of the range', () => {
    const { dateFrom, dateTo } = listAdminOrdersQuerySchema.parse({
      dateFrom: '2026-11-26',
      dateTo: '2026-11-27',
    });
    const order = new Date('2026-11-26T00:36:00+07:00');
    expect(order >= dateFrom!).toBe(true);
    expect(order <= dateTo!).toBe(true);
  });

  it('keeps a full ISO timestamp unchanged', () => {
    const parsed = listAdminOrdersQuerySchema.parse({ dateFrom: '2026-11-10T03:00:00.000Z' });
    expect(parsed.dateFrom?.toISOString()).toBe('2026-11-10T03:00:00.000Z');
  });

  it('leaves the dates undefined when omitted', () => {
    const parsed = listAdminOrdersQuerySchema.parse({});
    expect(parsed.dateFrom).toBeUndefined();
    expect(parsed.dateTo).toBeUndefined();
  });
});
