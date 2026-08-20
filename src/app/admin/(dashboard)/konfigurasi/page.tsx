'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { BannerImageManager, type BannerImageItem } from '@/components/admin/BannerImageManager';
import { ProductPicker, type ProductOption } from '@/components/admin/ProductPicker';
import { btnOutline, btnSolid } from '@/lib/styles';

type HomepageSection = {
  id?: string;
  key: string;
  title: string;
  subtitle: string;
  promoImageUrl: string;
  position: number;
  productIds: string[];
};

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
  return 'Gagal menyimpan konfigurasi. Periksa kembali data yang diisi.';
}

export default function AdminKonfigurasiPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [sections, setSections] = useState<HomepageSection[]>([]);

  const [banners, setBanners] = useState<
    Record<'HERO_MAIN' | 'HERO_SIDE_1' | 'HERO_SIDE_2', BannerImageItem[]>
  >({
    HERO_MAIN: [],
    HERO_SIDE_1: [],
    HERO_SIDE_2: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const skipDirtyTracking = useRef(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [productsRes, homepageRes] = await Promise.all([
        fetch('/api/admin/products?limit=60'),
        fetch('/api/admin/config/homepage'),
      ]);

      if (productsRes.ok) {
        const data: { items: ProductOption[] } = await productsRes.json();
        setProducts(data.items);
      }

      if (homepageRes.ok) {
        const data = await homepageRes.json();
        if (data.sections) {
          setSections(data.sections);
        }
        if (data.banners) {
          setBanners({
            HERO_MAIN: data.banners.HERO_MAIN ?? [],
            HERO_SIDE_1: data.banners.HERO_SIDE_1 ?? [],
            HERO_SIDE_2: data.banners.HERO_SIDE_2 ?? [],
          });
        }
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
  }, [sections, banners, loading]);

  function toggleHomepageProduct(sectionId: string | undefined, productId: string) {
    if (!sectionId) return;
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        const current = section.productIds;
        const next = current.includes(productId)
          ? current.filter((id) => id !== productId)
          : [...current, productId];
        return { ...section, productIds: next };
      }),
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);

    const response = await fetch('/api/admin/config/homepage', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ banners, sections }),
    });

    if (response.ok) {
      setSaveMessage('Konfigurasi Beranda berhasil disimpan!');
      setDirty(false);
    } else {
      const data = await response.json().catch(() => null);
      setSaveMessage(formatSaveError(data));
    }

    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Memuat data...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Konfigurasi Beranda</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Atur banner hero, section, dan buku yang tampil di halaman Beranda
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
          <h3 className="font-semibold text-foreground">Banner Hero Beranda</h3>
          <BannerImageManager
            label="Gambar Banner Utama"
            images={banners.HERO_MAIN}
            onChange={(images) => setBanners((prev) => ({ ...prev, HERO_MAIN: images }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
            <BannerImageManager
              label="Gambar Banner Samping 1"
              images={banners.HERO_SIDE_1}
              onChange={(images) => setBanners((prev) => ({ ...prev, HERO_SIDE_1: images }))}
            />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
            <BannerImageManager
              label="Gambar Banner Samping 2"
              images={banners.HERO_SIDE_2}
              onChange={(images) => setBanners((prev) => ({ ...prev, HERO_SIDE_2: images }))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Pilih Buku per Section</h3>
              <p className="text-xs text-neutral-500">
                Centang produk yang ingin ditampilkan di setiap section.
              </p>
            </div>
            <Link href="/admin/konfigurasi/section" className={btnOutline}>
              Atur Section
            </Link>
          </div>

          {sections.length === 0 ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center">
              <p className="text-sm text-neutral-500">Belum ada section.</p>
              <Link
                href="/admin/konfigurasi/section"
                className="mt-2 inline-block text-sm text-brand hover:underline"
              >
                Buat section pertama
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {sections.map((section) => (
                <ProductPicker
                  key={section.id ?? section.key}
                  label={section.title}
                  products={products}
                  selected={section.productIds}
                  onToggle={(productId) => toggleHomepageProduct(section.id, productId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {saveMessage ? (
        <p className={`text-sm ${saveMessage.includes('berhasil') ? 'text-green' : 'text-red'}`}>
          {saveMessage}
        </p>
      ) : null}

      {dirty ? (
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 shadow-md">
          <p className="text-sm font-medium text-amber-800">
            Ada perubahan belum disimpan. Klik Simpan agar tampil di halaman toko.
          </p>
          <button type="button" disabled={saving} onClick={handleSave} className={btnSolid}>
            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end border-t border-neutral-200 pt-4">
          <button type="button" disabled={saving} onClick={handleSave} className={btnSolid}>
            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
          </button>
        </div>
      )}
    </div>
  );
}
