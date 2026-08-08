export const CART_UPDATED_EVENT = 'gsb:cart-updated';

export function dispatchCartUpdated(): void {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}
