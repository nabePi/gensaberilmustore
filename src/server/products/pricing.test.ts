import { describe, expect, it } from 'vitest';

import {
  computeFinalPrice,
  minFixedPrice,
  percentFromFixedPrice,
  resolveActiveDiscount,
} from './pricing';

describe('computeFinalPrice', () => {
  it('returns the same price when there is no discount', () => {
    expect(computeFinalPrice(100000, 0)).toBe(100000);
  });

  it('applies a percentage discount, rounded to the nearest rupiah', () => {
    expect(computeFinalPrice(99999, 10)).toBe(89999);
  });

  it('applies a large discount correctly', () => {
    expect(computeFinalPrice(50000, 90)).toBe(5000);
  });
});

describe('fixed promo price', () => {
  const base = { price: 100000, discountPercent: 25, discountPrice: 75000 };

  it('uses the fixed price while the discount is active', () => {
    expect(computeFinalPrice(100000, 25, 75000)).toBe(75000);
    expect(resolveActiveDiscount({ ...base, discountEndDate: null })).toEqual({
      discountPercent: 25,
      finalPrice: 75000,
    });
  });

  it('falls back to the normal price once the discount has expired', () => {
    const expired = new Date('2020-01-01');
    expect(resolveActiveDiscount({ ...base, discountEndDate: expired })).toEqual({
      discountPercent: 0,
      finalPrice: 100000,
    });
  });

  it('derives a badge percent of at least 1 and a 90% floor price', () => {
    expect(percentFromFixedPrice(100000, 75000)).toBe(25);
    expect(percentFromFixedPrice(100000, 99999)).toBe(1);
    expect(minFixedPrice(99999)).toBe(10000);
  });
});
