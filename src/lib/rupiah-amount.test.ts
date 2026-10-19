import { describe, expect, it } from 'vitest';

import { parseRupiahAmount } from './rupiah-amount';

describe('parseRupiahAmount', () => {
  it.each([
    ['150123', 150123],
    ['150.123', 150123],
    ['Rp150.123', 150123],
    [' Rp 150.123,00 ', 150123],
    ['1.500.123,00', 1500123],
    ['0', 0],
  ])('parses %s as whole rupiah', (input, expected) => {
    expect(parseRupiahAmount(input)).toBe(expected);
  });

  it.each([
    '',
    ' ',
    '-150123',
    '150.12',
    '150,123',
    '150.123,50',
    '1e5',
    'abc',
    '9007199254740992',
  ])('rejects invalid or ambiguous amounts (%s)', (input) => {
    expect(parseRupiahAmount(input)).toBeNull();
  });
});
