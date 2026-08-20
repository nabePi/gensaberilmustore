'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { ProductPicker, type ProductOption } from '@/components/admin/ProductPicker';
import { btnOutline, btnSolid, inputBase } from '@/lib/styles';

type KidsSectionForm = {
  id?: string;
  title: string;
  subtitle: string;
  badge: string;
  theme: 'CREAM' | 'MINT' | 'CORAL' | 'YELLOW' | 'LAVENDER';
  showDiscountTag: boolean;
  position: number;
  productIds: string[];
};

const THEME_OPTIONS: { value: KidsSectionForm['theme']; label: string }[] = [
  { value: 'MINT', label: 'Mint (biru muda)' },
  { value: 'CORAL', label: 'Coral (oranye muda)' },
  { value: 'CREAM', label: 'Cream (kuning pucat)' },
  { value: 'YELLOW', label: 'Yellow (kuning)' },
  { value: 'LAVENDER', label: 'Lavender (ungu muda)' },
];

function emptySection(position: number): KidsSectionForm {
  return {
    title: '',
    subtitle: '',
    badge: '',
    theme: 'MINT',
    showDiscountTag: false,
    position,
    productIds: [],
  };
}

function formatSaveError(data: unknown): string {
  if (data && typeof data === 'object' && 'issues' in data) {
    const issues = (data as { issues?: Record<string, string[] | string> }).issues;
    if (issues) {
      return Object.entries(issues)
        .map(
          ([field, messages]) =>
            `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`,
        )
        .join(' · ');
    }
  }
  if (data && typeof data === 'object' && 'error' in data) {
    return String((data as { error?: unknown }).error ?? 'Gagal menyimpan');
  }
  return 'Gagal menyimpan section. Periksa kembali data yang diisi.';
}

export default function AdminKonfigurasiKidsSectionPage() {
  const [sections, setSections] = useState<KidsSectionForm[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const skipDirtyTracking = useRef(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [sectionsRes, productsRes] = await Promise.all([
        fetch('/api/admin/config/kids/sections'),
        fetch('/api/admin/products?limit=60'),
      ]);
      if (sectionsRes.ok) {
        const data = await sectionsRes.json();
        setSections(data.sections ?? []);
      }
      if (productsRes.ok) {
        const data: { items: ProductOption[] } = await productsRes.json();
        setProducts(data.items);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (skipDirtyTracking.current) {
      skipDirtyTracking.current = false;
      return;
    }
    setDirty(true);
  }, [sections, loading]);

  function updateSection(index: number, patch: Partial<KidsSectionForm>) {
    setSections((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      next[index] = { ...current, ...patch };
      return next;
    });
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      const a = next[index];
      const b = next[target];
      if (!a || !b) return prev;
      next[index] = { ...b, position: a.position };
      next[target] = { ...a, position: b.position };
      return next;
    });
  }

  function addSection() {
    setSections((prev) => [...prev, emptySection(prev.length)]);
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleProduct(index: number, productId: string) {
    setSections((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const productIds = current.productIds.includes(productId)
        ? current.productIds.filter((id) => id !== productId)
        : [...current.productIds, productId];
      next[index] = { ...current, productIds };
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);

    const response = await fetch('/api/admin/config/kids/sections', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sections: sections.map((section, position) => ({ ...section, position })),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setSections(data.sections ?? []);
      setSaveMessage('Kids section berhasil disimpan!');
      setDirty(false);
    } else {
      const data = await response.json().catch(() => null);
      setSaveMessage(formatSaveError(data));
    }

    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Memuat section...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kelola Kids Section</h1>
          <p className="text-sm text-neutral-500">
            Buat section baru dan pilih buku yang tampil di setiap section halaman Buku Anak.
          </p>
        </div>
        <Link href="/admin/konfigurasi/kids" className={btnOutline}>
          Kembali ke Kids
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {sections.map((section, index) => (
          <div
            key={section.id ?? `new-${index}`}
            className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-neutral-600">Judul Section</label>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSection(index, { title: e.target.value })}
                      placeholder="Contoh: Buku Populer Anak"
                      className={inputBase}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-neutral-600">Badge</label>
                    <input
                      type="text"
                      value={section.badge}
                      onChange={(e) => updateSection(index, { badge: e.target.value })}
                      placeholder="Contoh: Paling Disukai"
                      className={inputBase}
                    />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-neutral-600">Subjudul</label>
                    <input
                      type="text"
                      value={section.subtitle}
                      onChange={(e) => updateSection(index, { subtitle: e.target.value })}
                      placeholder="Deskripsi singkat section"
                      className={inputBase}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-neutral-600">Warna Latar</label>
                    <select
                      value={section.theme}
                      onChange={(e) =>
                        updateSection(index, {
                          theme: e.target.value as KidsSectionForm['theme'],
                        })
                      }
                      className={inputBase}
                    >
                      {THEME_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={section.showDiscountTag}
                    onChange={(e) => updateSection(index, { showDiscountTag: e.target.checked })}
                    className="h-4 w-4"
                  />
                  Tampilkan label diskon (-%) pada kartu produk
                </label>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                  className="rounded-sm border border-neutral-200 px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === sections.length - 1}
                  className="rounded-sm border border-neutral-200 px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  className="rounded-sm border border-red px-2 py-1 text-xs text-red"
                >
                  Hapus
                </button>
              </div>
            </div>

            <ProductPicker
              label="Buku di Section Ini"
              products={products}
              selected={section.productIds}
              onToggle={(productId) => toggleProduct(index, productId)}
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={addSection} className={btnOutline}>
        + Tambah Section
      </button>

      {saveMessage ? (
        <p className={`text-sm ${saveMessage.includes('berhasil') ? 'text-green' : 'text-red'}`}>
          {saveMessage}
        </p>
      ) : null}

      {dirty ? (
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 shadow-md">
          <p className="text-sm font-medium text-amber-800">
            Ada perubahan belum disimpan. Klik Simpan agar section tampil di halaman Buku Anak.
          </p>
          <button type="button" disabled={saving} onClick={handleSave} className={btnSolid}>
            {saving ? 'Menyimpan...' : 'Simpan Section'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end border-t border-neutral-200 pt-4">
          <button type="button" disabled={saving} onClick={handleSave} className={btnSolid}>
            {saving ? 'Menyimpan...' : 'Simpan Section'}
          </button>
        </div>
      )}
    </div>
  );
}
