import { describe, expect, it } from 'vitest';

import { computeLineAffiliateDiscount, getAffiliateRateStatus } from '@/server/affiliate/rate';

const now = new Date('2030-06-01T00:00:00Z');

describe('getAffiliateRateStatus', () => {
  it('treats a rate without dates as running forever', () => {
    expect(getAffiliateRateStatus({ isActive: true, startsAt: null, endsAt: null }, now)).toBe(
      'ACTIVE',
    );
  });

  it('handles inactive, scheduled and expired rates', () => {
    expect(getAffiliateRateStatus({ isActive: false, startsAt: null, endsAt: null }, now)).toBe(
      'INACTIVE',
    );
    expect(
      getAffiliateRateStatus(
        { isActive: true, startsAt: new Date('2030-07-01T00:00:00Z'), endsAt: null },
        now,
      ),
    ).toBe('SCHEDULED');
    expect(
      getAffiliateRateStatus(
        { isActive: true, startsAt: null, endsAt: new Date('2030-05-01T00:00:00Z') },
        now,
      ),
    ).toBe('EXPIRED');
  });
});

describe('computeLineAffiliateDiscount', () => {
  it('applies percentage on the line total', () => {
    expect(
      computeLineAffiliateDiscount(
        { discountType: 'PERCENT', discountPercent: 10, discountAmount: null },
        { quantity: 2, lineTotal: 150000 },
      ),
    ).toBe(15000);
  });

  it('applies fixed amount per unit, capped at the line total', () => {
    const rate = { discountType: 'FIXED' as const, discountPercent: null, discountAmount: 20000 };
    expect(computeLineAffiliateDiscount(rate, { quantity: 3, lineTotal: 150000 })).toBe(60000);
    expect(computeLineAffiliateDiscount(rate, { quantity: 3, lineTotal: 30000 })).toBe(30000);
  });

  it('returns 0 when no discount is configured', () => {
    expect(
      computeLineAffiliateDiscount(
        { discountType: null, discountPercent: null, discountAmount: null },
        { quantity: 1, lineTotal: 100 },
      ),
    ).toBe(0);
  });
});
