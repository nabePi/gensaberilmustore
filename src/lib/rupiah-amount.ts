/** Parse whole rupiah amounts, including Indonesian bank statement formatting. */
export function parseRupiahAmount(input: string): number | null {
  const value = input.trim().replace(/^Rp\s*/i, '');
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,00)?$/.test(value)) return null;
  const amount = Number(value.replace(/\./g, '').replace(/,00$/, ''));
  return Number.isSafeInteger(amount) ? amount : null;
}
