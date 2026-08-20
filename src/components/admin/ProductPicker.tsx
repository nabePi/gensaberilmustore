'use client';

import { useState } from 'react';

import { inputBase } from '@/lib/styles';

export type ProductOption = { id: string; title: string; sku: string };

export function ProductPicker({
  label,
  products,
  selected,
  onToggle,
}: {
  label: string;
  products: ProductOption[];
  selected: string[];
  onToggle: (productId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = products.filter((product) =>
    product.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari produk..."
        className={inputBase}
      />
      <div className="max-h-48 overflow-y-auto rounded-md border border-neutral-100">
        {filtered.map((product) => (
          <label
            key={product.id}
            className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2 text-sm last:border-0 hover:bg-neutral-50"
          >
            <input
              type="checkbox"
              checked={selected.includes(product.id)}
              onChange={() => onToggle(product.id)}
            />
            <span className="flex-1">{product.title}</span>
            <span className="text-xs text-neutral-400">{product.sku}</span>
          </label>
        ))}
        {filtered.length === 0 ? (
          <p className="p-3 text-xs text-neutral-500">Tidak ada produk ditemukan.</p>
        ) : null}
      </div>
      <p className="text-xs text-neutral-500">{selected.length} produk dipilih</p>
    </div>
  );
}
