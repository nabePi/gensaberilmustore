'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { formatCurrency } from '@/lib/format';
import { btnOutline, btnSolid, cardBase, inputBase } from '@/lib/styles';

type CommissionRate = { percent: number; fixedAmount: number | null; isActive: boolean };

type AffiliateProduct = {
  id: string;
  title: string;
  slug: string;
  finalPrice: number;
  imageUrl: string | null;
  commissionRate: CommissionRate | null;
  isSelected: boolean;
};

function formatCommissionRate(rate: CommissionRate | null): string {
  if (!rate || !rate.isActive) return '-';
  if (rate.fixedAmount !== null) return `${formatCurrency(rate.fixedAmount)}/item`;
  return `${rate.percent}%`;
}

export default function MemberAfiliasiProdukPage() {
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set('q', query);

      const response = await fetch(`/api/affiliate/products?${params.toString()}`);
      if (!active) return;
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const data: { items: AffiliateProduct[] } = await response.json();
      setProducts(data.items);
      setSelectedIds((previous) => {
        const next = new Set(previous);
        for (const item of data.items) {
          if (item.isSelected) next.add(item.id);
        }
        return next;
      });
      setLoading(false);
    }

    const timeout = setTimeout(loadProducts, 300);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  function toggleProduct(id: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/affiliate/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: Array.from(selectedIds) }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Gagal menyimpan pilihan produk');
        return;
      }

      setSuccessMessage('Pilihan produk berhasil disimpan.');
    } catch {
      setError('Gagal menyimpan pilihan produk');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pilih Produk Afiliasi</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Pilih produk yang ingin Anda promosikan sebagai afiliasi.
          </p>
        </div>
        <Link href="/member/afiliasi" className={btnOutline}>
          Kembali
        </Link>
      </div>

      <input
        type="text"
        placeholder="Cari produk..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={`${inputBase} max-w-sm`}
      />

      {error ? <p className="text-sm text-red">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat produk...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-neutral-500">Tidak ada produk ditemukan.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const checked = selectedIds.has(product.id);
            return (
              <label
                key={product.id}
                className={`flex cursor-pointer items-center gap-3 p-3 ${cardBase} ${
                  checked ? 'border-brand ring-1 ring-brand' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleProduct(product.id)}
                  className="h-4 w-4 shrink-0"
                />
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="h-14 w-11 shrink-0 object-cover"
                  />
                ) : (
                  <div className="h-14 w-11 shrink-0 bg-neutral-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{product.title}</p>
                  <p className="text-xs text-neutral-500">{formatCurrency(product.finalPrice)}</p>
                  <p className="text-xs text-brand">
                    Komisi: {formatCommissionRate(product.commissionRate)}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      )}

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-neutral-200 bg-white/95 py-4 backdrop-blur">
        <button type="button" onClick={handleSave} disabled={saving} className={btnSolid}>
          {saving ? 'Menyimpan...' : `Simpan Pilihan (${selectedIds.size})`}
        </button>
        {successMessage ? <span className="text-sm text-green">{successMessage}</span> : null}
      </div>
    </div>
  );
}
