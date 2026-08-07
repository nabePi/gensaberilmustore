const NON_WORD_CHARS = new RegExp('[^\\p{L}\\p{N}]+', 'gu');

function toSearchTerms(q: string): string[] {
  return q
    .trim()
    .split(/\s+/)
    .map((term) => term.replace(NON_WORD_CHARS, ''))
    .filter((term) => term.length > 0);
}

/** Builds a Postgres tsquery string requiring every sanitized word to match. */
export function buildTsQuery(q: string): string {
  return toSearchTerms(q).join(' & ');
}

/** Like {@link buildTsQuery}, but every word matches as a prefix (for autocomplete). */
export function buildPrefixTsQuery(q: string): string {
  return toSearchTerms(q)
    .map((term) => `${term}:*`)
    .join(' & ');
}
