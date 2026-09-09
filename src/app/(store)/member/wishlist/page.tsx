import { WishlistItemsView } from '@/components/product/WishlistItemsView';

export default function MemberWishlistPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wishlist</h1>
        <p className="mt-1 text-sm text-neutral-500">Produk yang kamu simpan untuk dibeli nanti.</p>
      </div>
      <WishlistItemsView />
    </div>
  );
}
