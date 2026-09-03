'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { dispatchCartUpdated } from '@/lib/cart-events';
import { formatCurrency } from '@/lib/format';
import { btnOutline, btnSolid } from '@/lib/styles';

type CartItem = {
  id: string;
  productId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  priceSnapshot: number;
  normalPrice: number;
  isWholesale: boolean;
  wholesaleMinQty: number | null;
  quantity: number;
  lineTotal: number;
  flag: 'out_of_stock' | 'price_changed' | null;
};

type Cart = { items: CartItem[]; subtotal: number; itemCount: number };

const FLAG_MESSAGES: Record<'out_of_stock' | 'price_changed', string> = {
  out_of_stock: 'Stok tidak cukup untuk jumlah ini. Kurangi jumlah atau hapus item.',
  price_changed: 'Harga produk ini telah berubah sejak ditambahkan ke keranjang.',
};

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  useEffect(() => {
    async function loadCart() {
      const response = await fetch('/api/cart');
      const data: Cart = await response.json();
      setCart(data);
    }

    loadCart();
  }, []);

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    setPendingItemId(itemId);
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      if (response.ok) {
        setCart(await response.json());
        dispatchCartUpdated();
      }
    } finally {
      setPendingItemId(null);
    }
  }

  async function removeItem(itemId: string) {
    setPendingItemId(itemId);
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, { method: 'DELETE' });
      if (response.ok) {
        setCart(await response.json());
        dispatchCartUpdated();
      }
    } finally {
      setPendingItemId(null);
    }
  }

  if (cart === null) {
    return (
      <div className="container-prototype py-16 text-center text-sm text-neutral-500">
        Memuat keranjang...
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="container-prototype flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-foreground">Keranjang Anda Kosong</h1>
        <p className="text-sm text-neutral-500">
          Belum ada produk di keranjang. Yuk, mulai jelajahi koleksi buku kami.
        </p>
        <Link href="/products" className={btnSolid}>
          Mulai Belanja
        </Link>
      </div>
    );
  }

  const hasBlockingIssue = cart.items.some((item) => item.flag === 'out_of_stock');

  return (
    <div className="container-prototype py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Keranjang Belanja</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {cart.items.map((item) => (
            <div key={item.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex gap-4">
                <Link
                  href={`/products/${item.slug}`}
                  className="h-20 w-16 shrink-0 overflow-hidden rounded-sm bg-neutral-100"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </Link>

                <div className="flex flex-1 flex-col gap-1">
                  <Link
                    href={`/products/${item.slug}`}
                    className="text-sm font-semibold text-foreground hover:text-brand"
                  >
                    {item.title}
                  </Link>
                  {item.isWholesale ? (
                    <div className="flex flex-col">
                      <span className="text-xs text-neutral-400 line-through">
                        {formatCurrency(item.normalPrice)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-brand">
                          {formatCurrency(item.priceSnapshot)}
                        </p>
                        <span className="rounded-sm bg-navy/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">
                          Harga Grosir
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-brand">
                      {formatCurrency(item.priceSnapshot)}
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-sm border border-neutral-200">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={pendingItemId === item.id || item.quantity <= 1}
                        className="px-2.5 py-1.5 text-sm text-neutral-500 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Kurangi jumlah"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={pendingItemId === item.id}
                        className="px-2.5 py-1.5 text-sm text-neutral-500 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Tambah jumlah"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={pendingItemId === item.id}
                      className="text-xs font-medium text-red hover:underline disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                <p className="shrink-0 text-sm font-bold text-foreground">
                  {formatCurrency(item.lineTotal)}
                </p>
              </div>

              {item.flag ? (
                <p className="mt-3 rounded-sm bg-red/5 px-3 py-2 text-xs font-medium text-red">
                  {FLAG_MESSAGES[item.flag]}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="h-fit rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-base font-bold text-foreground">Ringkasan Belanja</h2>
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <span>Subtotal ({cart.itemCount} barang)</span>
            <span className="font-semibold text-foreground">{formatCurrency(cart.subtotal)}</span>
          </div>

          {hasBlockingIssue ? (
            <p className="mt-4 rounded-sm bg-red/5 px-3 py-2 text-xs font-medium text-red">
              Selesaikan masalah stok pada keranjang Anda sebelum melanjutkan ke pembayaran.
            </p>
          ) : null}

          <Link
            href="/checkout"
            aria-disabled={hasBlockingIssue}
            className={`${btnSolid} mt-5 w-full ${hasBlockingIssue ? 'pointer-events-none opacity-50' : ''}`}
          >
            Lanjutkan ke Pembayaran
          </Link>
          <Link href="/products" className={`${btnOutline} mt-2 w-full`}>
            Lanjutkan Belanja
          </Link>
        </div>
      </div>
    </div>
  );
}
