import { describe, expect, it } from 'vitest';

import { computeFinalPrice } from './pricing';

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
