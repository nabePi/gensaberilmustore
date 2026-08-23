import type { Metadata } from 'next';
import Link from 'next/link';

import { btnSolid } from '@/lib/styles';

export const metadata: Metadata = {
  title: 'Wishlist',
  alternates: { canonical: '/wishlist' },
};

export default function WishlistPage() {
  return (
    <div className="container-prototype flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-xl font-bold text-foreground">Wishlist Kamu</h1>
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
