import { describe, expect, it } from 'vitest';

import { splitByWeight } from './item-commission';

describe('splitByWeight', () => {
  it('gives the whole amount to a single line', () => {
    expect(splitByWeight(10000, [5])).toEqual([10000]);
  });

  it('splits in proportion and always adds up to the total', () => {
    const parts = splitByWeight(10000, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000);
    expect(splitByWeight(9000, [1, 2])).toEqual([3000, 6000]);
  });

  it('returns zeros when there is nothing to split', () => {
    expect(splitByWeight(0, [1, 2])).toEqual([0, 0]);
    expect(splitByWeight(500, [0, 0])).toEqual([0, 0]);
  });
});
