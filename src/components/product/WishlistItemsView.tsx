'use client';

import Link from 'next/link';

import { ProductCard } from '@/components/product/ProductCard';
import { useWishlist } from '@/components/product/WishlistContext';
import { btnSolid } from '@/lib/styles';

export function WishlistItemsView() {
  const { items, loading, toggle } = useWishlist();

  if (loading) {
    return <p className="text-sm text-neutral-500">Memuat wishlist...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white py-16 text-center">
        <p className="max-w-sm text-sm text-neutral-500">
          Belum ada produk yang disimpan ke wishlist. Yuk jelajahi koleksi kami dan simpan produk
          favoritmu.
        </p>
        <Link href="/products" className={btnSolid}>
          Jelajahi Produk
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((product) => (
        <div key={product.id} className="flex flex-col gap-2">
          <ProductCard product={product} />
          <button
            type="button"
            onClick={() => toggle(product)}
            className="text-xs font-medium text-red hover:underline"
          >
            Hapus dari wishlist
          </button>
        </div>
      ))}
    </div>
  );
}
