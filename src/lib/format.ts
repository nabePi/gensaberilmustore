const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  // Some ICU versions insert a non-breaking space between "Rp" and the
  // amount and some don't; strip all whitespace so server and client
  // render identically regardless of the runtime's ICU data.
  return currencyFormatter.format(amount).replace(/\s/g, '');
}
