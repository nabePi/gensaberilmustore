import { randomBytes } from 'node:crypto';

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFKD')
      .replace(COMBINING_MARKS, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200) || 'item'
  );
}

export async function generateUniqueSlug(
  title: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(title);
  let slug = base;

  while (await exists(slug)) {
    slug = `${base}-${randomBytes(3).toString('hex')}`;
  }

  return slug;
}
