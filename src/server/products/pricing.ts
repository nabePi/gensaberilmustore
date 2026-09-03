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
