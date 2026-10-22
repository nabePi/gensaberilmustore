import { checkoutGroupFor, type CheckoutGroup } from '@/lib/checkout-groups';

export class CheckoutGroupError extends Error {}

/** Use current product flags from the server, never a client supplied product list. */
export function selectCheckoutItems<T extends { product: { isPreOrderActive: boolean } }>(
  items: T[],
  group?: CheckoutGroup,
): T[] {
  if (!group) {
    if (new Set(items.map((item) => checkoutGroupFor(item.product.isPreOrderActive))).size > 1) {
      throw new CheckoutGroupError(
        'Produk PO dan non-PO harus dipesan terpisah. Pilih kelompok checkout di keranjang.',
      );
    }
    return items;
  }
  const selected = items.filter(
    (item) => checkoutGroupFor(item.product.isPreOrderActive) === group,
  );
  if (selected.length === 0) {
    throw new CheckoutGroupError(
      'Tidak ada barang untuk kelompok checkout ini. Periksa kembali keranjang Anda.',
    );
  }
  return selected;
}
