'use client';

import Link from 'next/link';
import { useState } from 'react';

import { dispatchCartUpdated } from '@/lib/cart-events';
import { formatCurrency } from '@/lib/format';
import { badgeBase, btnSolidSm } from '@/lib/styles';

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

      dispatchCartUpdated();
      setStatus('added');
      setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="flex w-full flex-col bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-md">
      <Link href={`/products/${product.slug}`} className="relative block h-44 bg-neutral-100">
        {product.ribbonType ? (
          <span
            className={`absolute left-2 top-2 z-10 ${badgeBase} ${RIBBON_STYLES[product.ribbonType] ?? 'bg-neutral-700 text-white'}`}
          >
            {product.ribbonText ?? product.ribbonType}
          </span>
        ) : null}
        {product.primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primaryImageUrl}
            alt={product.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-400">
            Tanpa Gambar
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 text-sm font-bold text-foreground hover:text-brand"
        >
          {product.title}
        </Link>
        {product.author ? <p className="text-xs text-neutral-500">{product.author}</p> : null}
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-sm font-bold text-brand">{formatCurrency(product.finalPrice)}</span>
          {product.discountPercent ? (
            <span className="text-xs text-neutral-400 line-through">
              {formatCurrency(product.price)}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={status === 'loading' || outOfStock}
          className={`${btnSolidSm} mt-2 w-full`}
        >
          {outOfStock
            ? 'Stok Habis'
            : status === 'added'
              ? 'Ditambahkan!'
              : status === 'loading'
                ? 'Menambahkan...'
                : 'Tambah ke Keranjang'}
        </button>
      </div>
    </div>
  );
}
