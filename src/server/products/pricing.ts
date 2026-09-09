export function computeFinalPrice(price: number, discountPercent: number): number {
  return Math.round(price - (price * discountPercent) / 100);
}

export function computeEffectivePrice(
  price: number,
  discountPercent: number,
  isPreOrderActive: boolean,
  preOrderPrice: number | null | undefined,
): number {
  if (isPreOrderActive && preOrderPrice != null) {
    return preOrderPrice;
  }
  return computeFinalPrice(price, discountPercent);
}

export function resolveActiveDiscount(
  product: { price: number; discountPercent: number; discountEndDate: Date | null },
  now: Date = new Date(),
): { discountPercent: number; finalPrice: number } {
  const expired = product.discountEndDate != null && product.discountEndDate < now;
  const discountPercent = expired ? 0 : product.discountPercent;
  return { discountPercent, finalPrice: computeFinalPrice(product.price, discountPercent) };
}

export function computeUnitPrice(
  finalPrice: number,
  quantity: number,
  wholesalePrice: number | null | undefined,
  wholesaleMinQty: number | null | undefined,
): number {
  if (wholesalePrice != null && wholesaleMinQty != null && quantity >= wholesaleMinQty) {
    return wholesalePrice;
  }
  return finalPrice;
}
