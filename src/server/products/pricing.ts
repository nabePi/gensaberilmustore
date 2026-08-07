export function computeFinalPrice(price: number, discountPercent: number): number {
  return Math.round(price - (price * discountPercent) / 100);
}
