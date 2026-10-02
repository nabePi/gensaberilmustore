import type { LandingContent } from '@/server/landing/schema';

export type LandingChange = { section: string; text: string };

type LinkItem = LandingContent['links'][number];
type Leaf = string | number | boolean | undefined;

const FIELD_LABELS: Record<string, string> = {
  'hero.logo': 'Logo',
  'hero.logoAlt': 'Teks alternatif logo',
  'hero.eyebrow': 'Teks kecil di atas judul',
  'hero.title': 'Judul',
  'hero.tagline': 'Tagline',
  'background.poster': 'Poster latar',
  'background.videoDesktop': 'Video latar (desktop)',
  'background.videoMobile': 'Video latar (mobile)',
  'quickActions.saveContact.label': 'Tombol Simpan Kontak: teks',
  'quickActions.saveContact.toast': 'Tombol Simpan Kontak: notifikasi',
  'quickActions.saveContact.vcard.name': 'Kontak: nama',
  'quickActions.saveContact.vcard.org': 'Kontak: organisasi',
  'quickActions.saveContact.vcard.phone': 'Kontak: telepon',
  'quickActions.saveContact.vcard.url': 'Kontak: website',
  'quickActions.saveContact.vcard.instagram': 'Kontak: Instagram',
  'quickActions.share.label': 'Tombol Bagikan: teks',
  'quickActions.share.title': 'Bagikan: judul',
  'quickActions.share.text': 'Bagikan: pesan',
  'quickActions.share.toastShared': 'Bagikan: notifikasi berhasil',
  'quickActions.share.toastCopied': 'Bagikan: notifikasi tersalin',
  'quickActions.share.toastFallback': 'Bagikan: notifikasi cadangan',
  'marketplace.heading': 'Judul bagian marketplace',
  'footer.text': 'Teks footer',
  'footer.siteUrl': 'Link footer',
  'footer.icon': 'Ikon footer',
};

const ITEM_FIELD_LABELS: Record<string, string> = {
  label: 'nama',
  description: 'deskripsi',
  href: 'link',
  icon: 'ikon',
  iconSrc: 'gambar ikon',
  featured: 'sorotan',
};

const LIST_SECTIONS = [
  { title: 'Tautan utama', get: (c: LandingContent) => c.links },
  { title: 'Media sosial', get: (c: LandingContent) => c.social },
  { title: 'Marketplace', get: (c: LandingContent) => c.marketplace.items },
] as const;

function flatten(value: unknown, prefix: string, out: Record<string, Leaf>) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return;
  }
  out[prefix] = value as Leaf;
}

function show(value: Leaf): string {
  return value === undefined || value === '' ? '(kosong)' : `"${String(value)}"`;
}

function itemName(item: LinkItem): string {
  return item.label || '(tanpa nama)';
}

/** Human-readable list of what changed between the live content and the draft. */
export function diffLanding(live: LandingContent, draft: LandingContent): LandingChange[] {
  const changes: LandingChange[] = [];

  const before: Record<string, Leaf> = {};
  const after: Record<string, Leaf> = {};
  const scalarOnly = (content: LandingContent) => ({
    hero: content.hero,
    background: content.background,
    quickActions: content.quickActions,
    marketplace: { heading: content.marketplace.heading },
    footer: content.footer,
  });
  flatten(scalarOnly(live), '', before);
  flatten(scalarOnly(draft), '', after);

  for (const key of Object.keys(FIELD_LABELS)) {
    if (before[key] !== after[key]) {
      const section = key.split('.')[0] ?? '';
      changes.push({
        section: SECTION_TITLES[section] ?? section,
        text: `${FIELD_LABELS[key]}: ${show(before[key])} → ${show(after[key])}`,
      });
    }
  }

  for (const list of LIST_SECTIONS) {
    const liveItems = list.get(live);
    const draftItems = list.get(draft);
    const liveById = new Map(liveItems.map((item) => [item.id, item]));
    const draftById = new Map(draftItems.map((item) => [item.id, item]));

    for (const item of draftItems) {
      const previous = liveById.get(item.id);
      if (!previous) {
        changes.push({ section: list.title, text: `Item baru: ${itemName(item)}` });
        continue;
      }

      if (previous.visible !== item.visible) {
        changes.push({
          section: list.title,
          text: `${itemName(item)}: ${item.visible ? 'ditampilkan' : 'disembunyikan'}`,
        });
      }
      for (const [field, label] of Object.entries(ITEM_FIELD_LABELS)) {
        const a = previous[field as keyof LinkItem] as Leaf;
        const b = item[field as keyof LinkItem] as Leaf;
        if (a !== b) {
          changes.push({
            section: list.title,
            text: `${itemName(previous)}: ${label} ${show(a)} → ${show(b)}`,
          });
        }
      }
    }

    for (const item of liveItems) {
      if (!draftById.has(item.id)) {
        changes.push({ section: list.title, text: `Item dihapus: ${itemName(item)}` });
      }
    }

    const keptLive = liveItems.filter((item) => draftById.has(item.id)).map((item) => item.id);
    const keptDraft = draftItems.filter((item) => liveById.has(item.id)).map((item) => item.id);
    if (keptLive.join('|') !== keptDraft.join('|')) {
      changes.push({ section: list.title, text: 'Urutan diubah' });
    }
  }

  return changes;
}

const SECTION_TITLES: Record<string, string> = {
  hero: 'Header',
  background: 'Latar',
  quickActions: 'Tombol cepat',
  marketplace: 'Marketplace',
  footer: 'Footer',
};
