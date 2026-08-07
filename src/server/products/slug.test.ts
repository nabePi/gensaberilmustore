import { describe, expect, it } from 'vitest';

import { generateUniqueSlug, slugify } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Tafsir Ibnu Katsir Jilid 1 & 2')).toBe('tafsir-ibnu-katsir-jilid-1-2');
  });

  it('strips diacritics', () => {
    expect(slugify('Café Résumé')).toBe('cafe-resume');
  });

  it('falls back to "item" for input with no alphanumeric characters', () => {
    expect(slugify('   ')).toBe('item');
  });
});

describe('generateUniqueSlug', () => {
  it('returns the base slug when it does not already exist', async () => {
    const slug = await generateUniqueSlug('Buku Baru', async () => false);
    expect(slug).toBe('buku-baru');
  });

  it('appends a random suffix when the base slug is taken', async () => {
    let calls = 0;
    const slug = await generateUniqueSlug('Buku Baru', async () => {
      calls += 1;
      return calls === 1;
    });
    expect(slug).toMatch(/^buku-baru-[0-9a-f]{6}$/);
  });
});
