import { describe, expect, it } from 'vitest';

import { diffLanding } from '@/lib/landing/diff';
import fixture from '@/server/landing/fixture.content.json';
import type { LandingContent } from '@/server/landing/schema';

const live = fixture as LandingContent;
const clone = () => structuredClone(live);
const texts = (draft: LandingContent) => diffLanding(live, draft).map((c) => c.text);

describe('diffLanding', () => {
  it('returns nothing for identical content', () => {
    expect(diffLanding(live, clone())).toEqual([]);
  });

  it('describes changed text fields', () => {
    const draft = clone();
    draft.hero.tagline = 'Baru';
    expect(texts(draft)).toEqual(['Tagline: "Learn History, Repeat Victory!" → "Baru"']);
  });

  it('describes link edits, visibility, additions and removals', () => {
    const draft = clone();
    draft.links[0]!.label = 'Belanja Sekarang';
    draft.links[1]!.visible = false;
    draft.links.splice(2, 1);
    draft.links.push({
      id: 'baru',
      label: 'Link Baru',
      href: 'https://example.com',
      visible: true,
    });

    expect(texts(draft)).toEqual([
      'Belanja Buku di Website: nama "Belanja Buku di Website" → "Belanja Sekarang"',
      'Belanja di Gensa Kids: disembunyikan',
      'Item baru: Link Baru',
      'Item dihapus: Gabung Channel WhatsApp',
    ]);
  });

  it('detects reordering without reporting per-item edits', () => {
    const draft = clone();
    draft.social.reverse();
    expect(diffLanding(live, draft)).toEqual([{ section: 'Media sosial', text: 'Urutan diubah' }]);
  });

  it('covers marketplace items and heading', () => {
    const draft = clone();
    draft.marketplace.heading = 'Belanja di marketplace';
    draft.marketplace.items[0]!.href = 'https://example.com/toko';
    expect(diffLanding(live, draft).map((c) => c.section)).toEqual(['Marketplace', 'Marketplace']);
  });
});
