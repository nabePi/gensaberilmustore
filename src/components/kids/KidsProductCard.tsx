'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { ProductCardData } from '@/components/product/ProductCard';
import { dispatchCartUpdated } from '@/lib/cart-events';
import { formatCurrency } from '@/lib/format';

export function KidsProductCard({
  product,
  showDiscountTag = false,
}: {
  product: ProductCardData;
  showDiscountTag?: boolean;
}) {
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
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition-all duration-200 hover:-translate-y-1.5 hover:shadow-xl">
      <div className="relative bg-[#FFF3E0] p-5">
        {showDiscountTag && product.discountPercent ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-red px-2.5 py-1 text-xs font-extrabold text-white shadow-md">
            -{product.discountPercent}%
          </span>
        ) : null}
        <Link href={`/products/${product.slug}`} className="block aspect-square overflow-hidden">
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
      <div className="flex flex-1 flex-col p-4">
        <Link
          href={`/products/${product.slug}`}
          className="font-display truncate text-[15px] font-bold text-foreground hover:text-brand"
        >
          {product.title}
        </Link>
        {product.author ? (
          <p className="mt-1 text-[13px] text-neutral-500">{product.author}</p>
        ) : null}
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-base font-bold text-foreground">
            {formatCurrency(product.finalPrice)}
          </span>
          {product.discountPercent ? (
            <span className="text-[13px] text-neutral-400 line-through">
              {formatCurrency(product.price)}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={status === 'loading' || outOfStock}
          className={`mt-3 w-full rounded-full px-3.5 py-2.5 text-[13px] font-bold text-white transition-colors ${
            outOfStock
              ? 'cursor-not-allowed bg-neutral-300'
              : status === 'error'
                ? 'bg-red'
                : 'bg-brand hover:bg-brand-700'
          } ${status === 'loading' ? 'animate-pulse opacity-70' : ''}`}
        >
          {outOfStock
            ? 'Stok Habis'
            : status === 'added'
              ? '✓ Ditambahkan'
              : status === 'error'
                ? 'Gagal, Coba Lagi'
                : status === 'loading'
                  ? 'Menambahkan...'
                  : 'Tambah ke Keranjang'}
        </button>
      </div>
    </div>
  );
}
