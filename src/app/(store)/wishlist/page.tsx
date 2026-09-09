import type { Metadata } from 'next';
import Link from 'next/link';

import { WishlistItemsView } from '@/components/product/WishlistItemsView';
import { btnSolid } from '@/lib/styles';
import { getSessionUser } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Wishlist',
  alternates: { canonical: '/wishlist' },
};

export default async function WishlistPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="container-prototype flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">Wishlist Kamu</h1>
        <p className="max-w-sm text-sm text-neutral-500">
          Masuk terlebih dahulu untuk menyimpan dan melihat produk favoritmu di wishlist.
        </p>
        <Link href="/login?next=/wishlist" className={btnSolid}>
          Masuk
        </Link>
      </div>
    );
  }

  return (
    <div className="container-prototype flex flex-col gap-6 py-8">
      <h1 className="text-xl font-bold text-foreground">Wishlist Kamu</h1>
      <WishlistItemsView />
    </div>
  );
}
