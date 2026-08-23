'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ProductCard, type ProductCardData } from '@/components/product/ProductCard';

type ProductsResponse = {
  items: ProductCardData[];
  total: number;
};

export function InfiniteProductGrid({
  initialItems,
  initialPage,
  initialTotal,
  limit,
  queryString,
}: {
  initialItems: ProductCardData[];
  initialPage: number;
  initialTotal: number;
  limit: number;
  queryString: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadNextPage = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const nextPage = page + 1;
    try {
      const response = await fetch(`/api/products?${queryString}&page=${nextPage}&limit=${limit}`);
      if (!response.ok) return;
      const data: ProductsResponse = await response.json();
      setItems((current) => [...current, ...data.items]);
      setTotal(data.total);
      setPage(nextPage);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [page, queryString, limit]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadNextPage();
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextPage]);

  const allLoaded = items.length >= total;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {!allLoaded ? (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loading ? <span className="text-sm text-neutral-400">Memuat produk...</span> : null}
        </div>
      ) : null}
    </div>
  );
}
