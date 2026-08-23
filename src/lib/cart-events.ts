export const CART_UPDATED_EVENT = 'gsb:cart-updated';
export const CART_ITEM_ADDED_EVENT = 'gsb:cart-item-added';

export type CartItemAddedDetail = {
  imageUrl: string | null;
  productTitle: string;
  sourceRect: DOMRect | null;
};

export function dispatchCartUpdated(): void {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function dispatchCartItemAdded(detail: CartItemAddedDetail): void {
  window.dispatchEvent(new CustomEvent(CART_ITEM_ADDED_EVENT, { detail }));
}
