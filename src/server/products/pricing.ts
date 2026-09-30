// discountPrice is a fixed promo price; it applies only while a discount is active
// (discountPercent > 0 - expired discounts are resolved to 0 by resolveActiveDiscount).
export function computeFinalPrice(
  price: number,
  discountPercent: number,
  discountPrice?: number | null,
): number {
  if (discountPrice != null && discountPercent > 0) return discountPrice;
  return Math.round(price - (price * discountPercent) / 100);
}

// Percent shown on badges for a fixed-price promo; at least 1 so the discount reads as active.
export function percentFromFixedPrice(price: number, fixedPrice: number): number {
  return Math.max(1, Math.round(((price - fixedPrice) / price) * 100));
}

// Lowest fixed price allowed: keeps the derived percent within the 90% product-form limit.
export function minFixedPrice(price: number): number {
  return Math.ceil(price * 0.1);
}

export function computeEffectivePrice(
  price: number,
  discountPercent: number,
  isPreOrderActive: boolean,
  preOrderPrice: number | null | undefined,
  discountPrice?: number | null,
): number {
  if (isPreOrderActive && preOrderPrice != null) {
    return preOrderPrice;
  }
  return computeFinalPrice(price, discountPercent, discountPrice);
}

export function resolveActiveDiscount(
  product: {
    price: number;
    discountPercent: number;
    discountEndDate: Date | null;
    discountPrice: number | null;
  },
  now: Date = new Date(),
): { discountPercent: number; finalPrice: number } {
  const expired = product.discountEndDate != null && product.discountEndDate < now;
  const discountPercent = expired ? 0 : product.discountPercent;
  return {
    discountPercent,
    finalPrice: computeFinalPrice(product.price, discountPercent, product.discountPrice),
  };
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
