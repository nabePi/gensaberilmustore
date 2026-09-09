'use client';

import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import { adminCardBase, adminInputBase } from '@/lib/admin/styles';
import { handleImageError } from '@/lib/image';

export type ProductCardOption = {
  id: string;
  title: string;
  author: string;
  primaryImageUrl: string | null;
  discountPercent: number;
  discountEndDate: string | null;
};

const PAGE_SIZE = 40;

export function ProductCardPicker({
  onClose,
  alreadySelectedIds,
  onPick,
}: {
  onClose: () => void;
  alreadySelectedIds: string[];
  onPick: (product: ProductCardOption) => void;
}) {
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<ProductCardOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: '1' });
      if (q.trim()) params.set('q', q.trim());

      const response = await fetch(`/api/admin/products?${params.toString()}`);
      const data: { items: ProductCardOption[]; total: number } = await response.json();
      if (cancelled) return;
      setProducts(data.items);
      setPage(1);
      setHasMore(data.items.length < data.total);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [q]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const nextPage = page + 1;
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(nextPage) });
    if (q.trim()) params.set('q', q.trim());

    const response = await fetch(`/api/admin/products?${params.toString()}`);
    const data: { items: ProductCardOption[]; total: number } = await response.json();
    setProducts((prev) => [...prev, ...data.items]);
    setPage(nextPage);
    setHasMore(nextPage * PAGE_SIZE < data.total);
    setLoadingMore(false);
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      loadMore();
    }
  }

  return (
    <AdminModal title="Tambah Buku" onClose={onClose} widthClassName="max-w-3xl">
      <div className="flex flex-col gap-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari judul / penulis..."
          className={adminInputBase}
        />
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat produk...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-neutral-500">Produk tidak ditemukan.</p>
        ) : (
          <div
            onScroll={handleScroll}
            className="grid max-h-[55vh] grid-cols-2 gap-2.5 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4"
          >
            {products.map((product) => {
              const added = alreadySelectedIds.includes(product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={added}
                  onClick={() => onPick(product)}
                  className={`relative flex flex-col gap-1.5 p-2 text-left transition-colors ${adminCardBase} ${
                    added ? 'cursor-not-allowed opacity-50' : 'hover:border-brand'
                  }`}
                >
                  {product.primaryImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.primaryImageUrl}
                      alt=""
                      className="aspect-square w-full rounded-sm object-cover"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="aspect-square w-full rounded-sm bg-neutral-100" />
                  )}
                  <p className="line-clamp-2 text-xs font-medium text-foreground">
                    {product.title}
                  </p>
                  {added ? (
                    <span className="absolute right-1 top-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Ditambahkan
                    </span>
                  ) : null}
                </button>
              );
            })}
            {loadingMore ? (
              <p className="col-span-full py-2 text-center text-xs text-neutral-500">
                Memuat lebih banyak...
              </p>
            ) : null}
          </div>
        )}
      </div>
    </AdminModal>
  );
}
