'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { ProductPicker, type ProductOption } from '@/components/admin/ProductPicker';
import { SingleImageUpload } from '@/components/admin/SingleImageUpload';
import { btnOutline, btnSolid, inputBase } from '@/lib/styles';

type SectionForm = {
  id?: string;
  key: string;
  title: string;
  subtitle: string;
  promoImageUrl: string;
  position: number;
  isEnabled: boolean;
  backgroundColor: string;
  titleColor: string;
  productIds: string[];
};

function normalizeSections(
  raw: (SectionForm & { backgroundColor?: string | null; titleColor?: string | null })[],
): SectionForm[] {
  return raw.map((section) => ({
    ...section,
    backgroundColor: section.backgroundColor ?? '',
    titleColor: section.titleColor ?? '',
  }));
}

function emptySection(position: number): SectionForm {
  return {
    key: '',
    title: '',
    subtitle: '',
    promoImageUrl: '',
    position,
    isEnabled: true,
    backgroundColor: '',
    titleColor: '',
    productIds: [],
  };
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
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

export default function AdminKonfigurasiSectionPage() {
  const [sections, setSections] = useState<SectionForm[]>([]);
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
        fetch('/api/admin/config/homepage/sections'),
        fetch('/api/admin/products?limit=60'),
      ]);
      if (sectionsRes.ok) {
        const data = await sectionsRes.json();
        setSections(normalizeSections(data.sections ?? []));
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

  function updateSection(index: number, patch: Partial<SectionForm>) {
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

  function toggleSectionProduct(index: number, productId: string) {
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

    const response = await fetch('/api/admin/config/homepage/sections', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sections: sections.map((section, position) => ({
          ...section,
          position,
        })),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setSections(normalizeSections(data.sections ?? []));
      setSaveMessage('Section berhasil disimpan!');
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
          <h1 className="text-2xl font-bold text-foreground">Kelola Section</h1>
          <p className="text-sm text-neutral-500">
            Buat, ubah, dan atur urutan section yang muncul di halaman beranda.
          </p>
        </div>
        <Link href="/admin/konfigurasi" className={btnOutline}>
          Kembali ke Konfigurasi
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
                      placeholder="Contoh: Buku Terbaru"
                      className={inputBase}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-neutral-600">Key (URL)</label>
                    <input
                      type="text"
                      value={section.key}
                      onChange={(e) => updateSection(index, { key: normalizeKey(e.target.value) })}
                      placeholder="buku-terbaru"
                      className={inputBase}
                    />
                  </div>
                </div>
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
                <SingleImageUpload
                  label="Gambar Promo Section"
                  imageUrl={section.promoImageUrl}
                  onChange={(url) => updateSection(index, { promoImageUrl: url })}
                  placeholder="Upload gambar promo untuk section ini (opsional)."
                />
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-600">
                  <input
                    type="checkbox"
                    checked={section.isEnabled}
                    onChange={(e) => updateSection(index, { isEnabled: e.target.checked })}
                  />
                  Tampilkan section ini di beranda
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-neutral-600">
                      Warna Background (opsional)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={section.backgroundColor || '#dc2626'}
                        onChange={(e) => updateSection(index, { backgroundColor: e.target.value })}
                        className="h-9 w-10 shrink-0 rounded-sm border border-neutral-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={section.backgroundColor}
                        onChange={(e) => updateSection(index, { backgroundColor: e.target.value })}
                        placeholder="Kosongkan untuk tampilan default"
                        className={inputBase}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-neutral-600">
                      Warna Judul (opsional)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={section.titleColor || '#ffffff'}
                        onChange={(e) => updateSection(index, { titleColor: e.target.value })}
                        className="h-9 w-10 shrink-0 rounded-sm border border-neutral-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={section.titleColor}
                        onChange={(e) => updateSection(index, { titleColor: e.target.value })}
                        placeholder="Kosongkan untuk tampilan default"
                        className={inputBase}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-neutral-400">
                  Isi warna background untuk menjadikan section ini banner promo berwarna (mis.
                  Special Promotion). Kosongkan keduanya untuk tampilan section biasa.
                </p>
                <ProductPicker
                  label="Buku di Section Ini"
                  products={products}
                  selected={section.productIds}
                  onToggle={(productId) => toggleSectionProduct(index, productId)}
                />
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
            Ada perubahan belum disimpan. Klik Simpan agar section tampil di beranda.
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
