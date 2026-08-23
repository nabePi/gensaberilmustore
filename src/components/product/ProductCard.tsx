'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import { dispatchCartItemAdded } from '@/lib/cart-events';
import { formatCurrency } from '@/lib/format';

export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  author?: string | null;
  price: number;
  finalPrice: number;
  discountPercent?: number;
  stock?: number;
  ribbonType?: 'NEW' | 'BEST' | 'DISCOUNT' | null;
  ribbonText?: string | null;
  primaryImageUrl: string | null;
};

const RIBBON_STYLES: Record<string, string> = {
  NEW: 'bg-navy text-white',
  BEST: 'bg-brand text-white',
  DISCOUNT: 'bg-red text-white',
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'added' | 'error'>('idle');
  const [wishlisted, setWishlisted] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const outOfStock = product.stock !== undefined && product.stock <= 0;

  async function handleAddToCart() {
    setStatus('loading');
    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });

      if (!response.ok) {
        setStatus('error');
        return;
      }

      dispatchCartItemAdded({
        imageUrl: product.primaryImageUrl,
        productTitle: product.title,
        sourceRect: imageContainerRef.current?.getBoundingClientRect() ?? null,
      });
      setStatus('added');
      setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-sm border border-neutral-200 bg-white">
      <div
        ref={imageContainerRef}
        className="relative aspect-square w-full overflow-hidden bg-neutral-100"
      >
        {product.ribbonType ? (
          <span
            className={`absolute left-0 top-0 z-10 rounded-br-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${RIBBON_STYLES[product.ribbonType] ?? 'bg-neutral-700'}`}
          >
            {product.ribbonText ?? product.ribbonType}
          </span>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            setWishlisted((current) => !current);
          }}
          aria-label="Wishlist"
          className="absolute right-2 top-2 z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/90"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 stroke-[1.8] ${wishlisted ? 'fill-red stroke-red' : 'fill-none stroke-neutral-500'}`}
          >
            <path d="M12 21s-7.5-4.7-10-9.3C.5 8.1 2.6 4 6.4 4c2 0 3.8 1.1 4.9 2.8C12.4 5.1 14.2 4 16.2 4 20 4 22.1 8.1 21.5 11.7 19 16.3 12 21 12 21z" />
          </svg>
        </button>
        <Link href={`/products/${product.slug}`} className="absolute inset-0 block">
          {product.primaryImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.primaryImageUrl}
              alt={product.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-neutral-400">
              Tanpa Gambar
            </div>
          )}
        </Link>
      </div>
      <div className="flex flex-1 flex-col gap-[3px] px-2.5 pb-3 pt-2.5">
        <Link
          href={`/products/${product.slug}`}
          className="truncate text-[13px] font-semibold leading-[1.3] text-foreground hover:text-brand"
        >
          {product.title}
        </Link>
        {product.author ? <p className="text-xs text-neutral-500">{product.author}</p> : null}
        <div className="mt-auto flex items-end justify-between gap-1.5 pt-1.5">
          <div className="flex flex-col">
            {product.discountPercent ? (
              <span className="text-[11px] text-neutral-400">
                {formatCurrency(product.price)}
                <span className="ml-1 font-semibold text-red">-{product.discountPercent}%</span>
              </span>
            ) : null}
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(product.finalPrice)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={status === 'loading' || outOfStock}
            aria-label="Tambah ke keranjang"
            className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-base font-bold text-white transition-colors ${
              outOfStock
                ? 'cursor-not-allowed bg-neutral-300'
                : status === 'error'
                  ? 'bg-red'
                  : 'bg-brand hover:bg-brand-700'
            } ${status === 'loading' ? 'animate-pulse opacity-70' : ''}`}
          >
            {outOfStock ? '×' : status === 'added' ? '✓' : status === 'error' ? '!' : '+'}
          </button>
        </div>
      </div>
    </div>
  );
}
