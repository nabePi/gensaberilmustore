'use client';

import type { ProductCardData } from '@/components/product/ProductCard';
import { useWishlist } from '@/components/product/WishlistContext';

export function WishlistButton({ product }: { product: ProductCardData }) {
  const { isWishlisted, toggle } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  return (
    <button
      type="button"
      onClick={() => toggle(product)}
      aria-label="Wishlist"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-brand"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 stroke-[1.8] ${wishlisted ? 'fill-red stroke-red' : 'fill-none stroke-current'}`}
      >
        <path d="M12 21s-7.5-4.7-10-9.3C.5 8.1 2.6 4 6.4 4c2 0 3.8 1.1 4.9 2.8C12.4 5.1 14.2 4 16.2 4 20 4 22.1 8.1 21.5 11.7 19 16.3 12 21 12 21z" />
      </svg>
    </button>
  );
}
