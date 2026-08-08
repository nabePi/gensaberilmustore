'use client';

import { useState } from 'react';

import { dispatchCartUpdated } from '@/lib/cart-events';
import { btnSolid } from '@/lib/styles';

export function AddToCartPanel({ productId, stock }: { productId: string; stock: number }) {
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'added' | 'error'>('idle');
  const outOfStock = stock <= 0;

  async function handleAddToCart() {
    setStatus('loading');
    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
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
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center rounded-sm border border-neutral-200">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={outOfStock}
          className="px-3 py-2 text-sm text-neutral-500 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Kurangi jumlah"
        >
          -
        </button>
        <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
          disabled={outOfStock}
          className="px-3 py-2 text-sm text-neutral-500 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Tambah jumlah"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={status === 'loading' || outOfStock}
        className={`${btnSolid} flex-1`}
      >
        {outOfStock
          ? 'Stok Habis'
          : status === 'added'
            ? 'Ditambahkan ke Keranjang!'
            : status === 'loading'
              ? 'Menambahkan...'
              : 'Tambah ke Keranjang'}
      </button>
      {status === 'error' ? (
        <p className="w-full text-xs text-red">Gagal menambahkan produk. Coba lagi.</p>
      ) : null}
    </div>
  );
}
