import { describe, expect, it } from 'vitest';

import { buildPrefixTsQuery, buildTsQuery } from './text-search';

describe('buildTsQuery', () => {
  it('joins sanitized words with &', () => {
    expect(buildTsQuery('tafsir ibnu katsir')).toBe('tafsir & ibnu & katsir');
  });

  it('strips characters that have special meaning in tsquery syntax', () => {
    expect(buildTsQuery('C++ & Java!')).toBe('C & Java');
  });

  it('returns an empty string for blank input', () => {
    expect(buildTsQuery('   ')).toBe('');
  });
});

describe('buildPrefixTsQuery', () => {
  it('appends :* to every sanitized word', () => {
    expect(buildPrefixTsQuery('tafs ib')).toBe('tafs:* & ib:*');
  });

  it('returns an empty string for blank input', () => {
    expect(buildPrefixTsQuery('!!!')).toBe('');
  });
});
