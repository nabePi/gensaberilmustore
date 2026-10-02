import { describe, expect, it } from 'vitest';

import fixture from '@/server/landing/fixture.content.json';
import { landingContentSchema, serializeLandingContent } from '@/server/landing/schema';

function clone() {
  return structuredClone(fixture) as typeof fixture & Record<string, unknown>;
}

describe('landingContentSchema', () => {
  it('accepts the live content.json from the landing repo', () => {
    expect(landingContentSchema.safeParse(fixture).success).toBe(true);
  });

  it('round-trips with the exact formatting used in the repo', () => {
    const parsed = landingContentSchema.parse(fixture);
    expect(serializeLandingContent(parsed)).toBe(`${JSON.stringify(fixture, null, 2)}\n`);
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', 'ftp://x.com', 'wa.me/62812', ''])(
    'rejects unsafe or malformed href %j',
    (href) => {
      const content = clone();
      content.links[0]!.href = href;
      expect(landingContentSchema.safeParse(content).success).toBe(false);
    },
  );

  it('accepts site-relative and https hrefs', () => {
    const content = clone();
    content.links[0]!.href = '/kids';
    content.links[1]!.href = 'https://wa.me/6281384804494';
    expect(landingContentSchema.safeParse(content).success).toBe(true);
  });

  it('rejects empty labels, duplicate ids, unknown icons and extra keys', () => {
    const emptyLabel = clone();
    emptyLabel.links[0]!.label = '  ';
    expect(landingContentSchema.safeParse(emptyLabel).success).toBe(false);

    const duplicate = clone();
    duplicate.links[1]!.id = duplicate.links[0]!.id;
    expect(landingContentSchema.safeParse(duplicate).success).toBe(false);

    const badIcon = clone();
    (badIcon.links[0] as { icon?: string }).icon = 'Skull';
    expect(landingContentSchema.safeParse(badIcon).success).toBe(false);

    const extra = clone();
    extra.unexpected = true;
    expect(landingContentSchema.safeParse(extra).success).toBe(false);
  });

  it('caps the number of links', () => {
    const content = clone();
    (content as { links: unknown[] }).links = Array.from({ length: 21 }, (_, i) => ({
      id: `l${i}`,
      label: `Link ${i}`,
      description: '',
      href: 'https://example.com',
      visible: true,
    }));
    expect(landingContentSchema.safeParse(content).success).toBe(false);
  });
});
