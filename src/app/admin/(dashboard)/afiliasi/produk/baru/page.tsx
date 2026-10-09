'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  CHANNEL_LABEL,
  Cover,
  EMPTY_RATE_FORM,
  type RateFormState,
  RateSettingsFields,
  saveAffiliateProduct,
} from '@/components/admin/affiliate-product/shared';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import {
  adminBtnOutline,
  adminBtnOutlineSm,
  adminBtnPrimary,
  adminInputBase,
} from '@/lib/admin/styles';
import { formatCurrency } from '@/lib/format';

type Candidate = {
  id: string;
  title: string;
  sku: string;
  author: string;
  finalPrice: number;
  channel: 'WEB' | 'POS' | 'BOTH';
  primaryImageUrl: string | null;
};

const PAGE_SIZE = 24;

export default function AdminTambahProdukAfiliasiPage() {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Selection survives search and paging, so it is kept as a map of id -> product.
  const [selected, setSelected] = useState<Record<string, Candidate>>({});
  const [form, setForm] = useState<RateFormState>(EMPTY_RATE_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (q) params.set('q', q);
      const response = await fetch(`/api/admin/commission-rates/candidates?${params.toString()}`);
      if (response.ok) {
        const data: { items: Candidate[]; total: number } = await response.json();
        setCandidates(data.items);
        setTotal(data.total);
        setLoadError(null);
      } else {
        setLoadError('Gagal memuat daftar produk');
      }
      setLoading(false);
    }
    load();
  }, [q, page, reloadKey]);

  const selectedList = Object.values(selected);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allOnPageSelected =
    candidates.length > 0 && candidates.every((product) => selected[product.id]);

  function toggle(product: Candidate) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[product.id]) delete next[product.id];
      else next[product.id] = product;
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = { ...prev };
      for (const product of candidates) {
        if (allOnPageSelected) delete next[product.id];
        else next[product.id] = product;
      }
      return next;
    });
  }

  async function handleSave() {
    if (selectedList.length === 0) {
      setFormError('Pilih minimal satu produk');
      return;
    }
    setSaving(true);
    setFormError(null);

    const failed: string[] = [];
    for (const product of selectedList) {
      const message = await saveAffiliateProduct(product.id, form);
      if (message) {
        if (failed.length === 0) setFormError(`${product.title}: ${message}`);
        failed.push(product.id);
      }
    }
    setSaving(false);

    if (failed.length === 0) {
      router.push('/admin/afiliasi/produk');
      return;
    }
    // Keep only the products that failed so the admin can fix the form and retry.
    setSelected((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => failed.includes(id))),
    );
    setReloadKey((key) => key + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tambah Produk Afiliasi"
        description="Pilih buku/produk yang akan diafiliasikan, lalu atur komisi, diskon, dan periodenya"
        action={
          <Link href="/admin/afiliasi/produk" className={adminBtnOutlineSm}>
            ← Kembali
          </Link>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex flex-col gap-4" aria-label="Pilih produk">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="search"
              aria-label="Cari produk"
              placeholder="Cari judul, penulis, atau SKU"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`${adminInputBase} sm:w-80`}
            />
            <div className="flex items-center gap-3 text-sm text-neutral-600">
              <span>{total} produk tersedia</span>
              <button
                type="button"
                disabled={candidates.length === 0}
                onClick={togglePage}
                className={adminBtnOutlineSm}
              >
                {allOnPageSelected ? 'Batal pilih halaman ini' : 'Pilih semua di halaman ini'}
              </button>
            </div>
          </div>

          <p className="text-xs text-neutral-500">
            Hanya produk aktif dengan channel Website atau Website + POS yang belum masuk program
            afiliasi yang ditampilkan.
          </p>

          {loadError ? (
            <p role="alert" className="text-sm text-red">
              {loadError}
            </p>
          ) : null}

          {loading && candidates.length === 0 ? (
            <p className="text-sm text-neutral-500">Memuat produk...</p>
          ) : candidates.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center text-sm text-neutral-500">
              Tidak ada produk yang bisa ditambahkan.
            </div>
          ) : (
            <div
              className={`grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 ${
                loading ? 'opacity-60' : ''
              }`}
            >
              {candidates.map((product) => {
                const isSelected = Boolean(selected[product.id]);
                return (
                  <button
                    key={product.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(product)}
                    className={`relative flex flex-col gap-2 rounded-xl border bg-white p-2.5 text-left transition-colors ${
                      isSelected
                        ? 'border-brand ring-2 ring-brand/30'
                        : 'border-neutral-200 hover:border-brand'
                    }`}
                  >
                    <Cover
                      url={product.primaryImageUrl}
                      className="aspect-[3/4] w-full rounded-md"
                    />
                    <span
                      aria-hidden
                      className={`absolute right-3.5 top-3.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isSelected
                          ? 'bg-brand text-white'
                          : 'bg-white/90 text-transparent ring-1 ring-neutral-300'
                      }`}
                    >
                      ✓
                    </span>
                    <p className="line-clamp-2 text-sm font-medium text-foreground">
                      {product.title}
                    </p>
                    {product.author ? (
                      <p className="line-clamp-1 text-xs text-neutral-500">{product.author}</p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(product.finalPrice)}
                      </span>
                      <span className="text-2xs text-neutral-500">
                        {CHANNEL_LABEL[product.channel]}
                      </span>
                    </div>
                    <p className="text-2xs text-neutral-400">{product.sku}</p>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className={adminBtnOutlineSm}
            >
              Sebelumnya
            </button>
            <span className="text-sm text-neutral-600">
              Halaman {page} dari {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={adminBtnOutlineSm}
            >
              Berikutnya
            </button>
          </div>
        </section>

        <aside className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-theme-sm lg:sticky lg:top-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Produk dipilih ({selectedList.length})
            </p>
            {selectedList.length === 0 ? (
              <p className="mt-1 text-xs text-neutral-500">
                Klik kartu buku di sebelah kiri untuk memilih. Pengaturan di bawah berlaku untuk
                semua produk yang dipilih.
              </p>
            ) : (
              <ul className="mt-2 flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                {selectedList.map((product) => (
                  <li key={product.id} className="flex items-center gap-2.5">
                    <Cover url={product.primaryImageUrl} className="h-12 w-9 shrink-0 rounded-sm" />
                    <p className="line-clamp-2 min-w-0 flex-1 text-xs font-medium text-foreground">
                      {product.title}
                    </p>
                    <button
                      type="button"
                      aria-label={`Batal pilih ${product.title}`}
                      onClick={() => toggle(product)}
                      className="px-1 text-neutral-400 hover:text-red"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <RateSettingsFields
            form={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />

          {formError ? (
            <p role="alert" className="text-sm text-red">
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Link href="/admin/afiliasi/produk" className={adminBtnOutline}>
              Batal
            </Link>
            <button
              type="button"
              disabled={saving || selectedList.length === 0}
              onClick={handleSave}
              className={adminBtnPrimary}
            >
              {saving
                ? 'Menyimpan...'
                : `Simpan${selectedList.length ? ` (${selectedList.length})` : ''}`}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
