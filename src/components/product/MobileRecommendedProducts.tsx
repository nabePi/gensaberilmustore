'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ProductCard, type ProductCardData } from '@/components/product/ProductCard';

const PAGE_LIMIT = 12;

type ProductsResponse = {
  items: ProductCardData[];
  total: number;
};

export function MobileRecommendedProducts() {
  const pathname = usePathname();
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadNextPage = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const nextPage = page + 1;
    try {
      const response = await fetch(`/api/products?page=${nextPage}&limit=${PAGE_LIMIT}`);
      if (!response.ok) return;
      const data: ProductsResponse = await response.json();
      setItems((current) => [...current, ...data.items]);
      setTotal(data.total);
      setPage(nextPage);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [page]);

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

  const allLoaded = total !== null && items.length >= total;

  if (pathname === '/products' || pathname === '/login' || pathname === '/signup') return null;

  return (
    <section className="container-prototype py-10 lg:hidden">
      <h2 className="text-lg font-bold text-foreground">Rekomendasi Untukmu</h2>
      <p className="mt-1 text-sm text-neutral-500">Jelajahi koleksi buku kami lainnya</p>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {!allLoaded ? (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loading ? <span className="text-sm text-neutral-400">Memuat buku...</span> : null}
        </div>
      ) : null}
    </section>
  );
}
