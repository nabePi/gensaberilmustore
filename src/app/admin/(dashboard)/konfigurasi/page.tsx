'use client';

import type { KidsSectionKey } from '@prisma/client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { BannerImageManager, type BannerImageItem } from '@/components/admin/BannerImageManager';
import { btnOutline, btnSolid, inputBase } from '@/lib/styles';

type ProductOption = { id: string; title: string; sku: string };

type HomepageSection = {
  id?: string;
  key: string;
  title: string;
  subtitle: string;
  promoImageUrl: string;
  position: number;
  productIds: string[];
};

type KidsForm = {
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  heroImageUrl: string;
  promoBadge: string;
  promoTitle: string;
  promoDescription: string;
  promoImageUrl: string;
};

const KIDS_SECTIONS: { key: KidsSectionKey; label: string }[] = [
  { key: 'POPULAR', label: 'Buku Populer Anak' },
  { key: 'DISCOUNT', label: 'Buku Diskon' },
];

const EMPTY_KIDS_FORM: KidsForm = {
  heroBadge: '',
  heroTitle: '',
  heroDescription: '',
  heroImageUrl: '',
  promoBadge: '',
  promoTitle: '',
  promoDescription: '',
  promoImageUrl: '',
};

function ProductPicker({
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

export default function AdminKonfigurasiPage() {
  const [tab, setTab] = useState<'home' | 'kids'>('home');
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [sections, setSections] = useState<HomepageSection[]>([]);

  const [banners, setBanners] = useState<
    Record<'HERO_MAIN' | 'HERO_SIDE_1' | 'HERO_SIDE_2', BannerImageItem[]>
  >({
    HERO_MAIN: [],
    HERO_SIDE_1: [],
    HERO_SIDE_2: [],
  });

  const [kidsForm, setKidsForm] = useState<KidsForm>(EMPTY_KIDS_FORM);
  const [kidsSections, setKidsSections] = useState<Record<KidsSectionKey, string[]>>({
    POPULAR: [],
    DISCOUNT: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const skipDirtyTracking = useRef(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [productsRes, homepageRes, kidsRes] = await Promise.all([
        fetch('/api/admin/products?limit=60'),
        fetch('/api/admin/config/homepage'),
        fetch('/api/admin/config/kids'),
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

      if (kidsRes.ok) {
        const data = await kidsRes.json();
        if (data.config) {
          setKidsForm({
            heroBadge: data.config.heroBadge,
            heroTitle: data.config.heroTitle,
            heroDescription: data.config.heroDescription,
            heroImageUrl: data.config.heroImageUrl,
            promoBadge: data.config.promoBadge,
            promoTitle: data.config.promoTitle,
            promoDescription: data.config.promoDescription,
            promoImageUrl: data.config.promoImageUrl,
          });
        }
        setKidsSections(data.sections);
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
  }, [sections, banners, kidsForm, kidsSections, loading]);

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

  function toggleKidsProduct(key: KidsSectionKey, productId: string) {
    setKidsSections((prev) => {
      const current = prev[key];
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      return { ...prev, [key]: next };
    });
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
    return 'Gagal menyimpan konfigurasi. Periksa kembali data yang diisi.';
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);

    if (tab === 'home') {
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
    } else {
      const response = await fetch('/api/admin/config/kids', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...kidsForm, sections: kidsSections }),
      });

      if (response.ok) {
        setSaveMessage('Konfigurasi Buku Anak berhasil disimpan!');
        setDirty(false);
      } else {
        const data = await response.json().catch(() => null);
        setSaveMessage(formatSaveError(data));
      }
    }

    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Memuat data...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Konfigurasi Tampilan</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Atur banner hero, section, dan buku yang tampil di halaman Beranda serta Buku Anak
        </p>
      </div>

      <div className="flex gap-2 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setTab('home')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'home'
              ? 'border-b-2 border-brand text-brand'
              : 'text-neutral-500 hover:text-foreground'
          }`}
        >
          Beranda
        </button>
        <button
          type="button"
          onClick={() => setTab('kids')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'kids'
              ? 'border-b-2 border-brand text-brand'
              : 'text-neutral-500 hover:text-foreground'
          }`}
        >
          Buku Anak
        </button>
      </div>

      {tab === 'home' ? (
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
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
            <h3 className="font-semibold text-foreground">Hero Buku Anak</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="kidsHeroBadge" className="text-xs font-medium text-neutral-600">
                  Badge
                </label>
                <input
                  id="kidsHeroBadge"
                  type="text"
                  value={kidsForm.heroBadge}
                  onChange={(e) => setKidsForm((prev) => ({ ...prev, heroBadge: e.target.value }))}
                  placeholder="Selamat Datang, Kecil!"
                  className={inputBase}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="kidsHeroImage" className="text-xs font-medium text-neutral-600">
                  Gambar Hero (URL)
                </label>
                <input
                  id="kidsHeroImage"
                  type="text"
                  value={kidsForm.heroImageUrl}
                  onChange={(e) =>
                    setKidsForm((prev) => ({ ...prev, heroImageUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  className={inputBase}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="kidsHeroTitle" className="text-xs font-medium text-neutral-600">
                Judul
              </label>
              <input
                id="kidsHeroTitle"
                type="text"
                value={kidsForm.heroTitle}
                onChange={(e) => setKidsForm((prev) => ({ ...prev, heroTitle: e.target.value }))}
                placeholder="Dunia Buku yang Ceria dan Penuh Warna"
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="kidsHeroDescription" className="text-xs font-medium text-neutral-600">
                Deskripsi
              </label>
              <textarea
                id="kidsHeroDescription"
                rows={3}
                value={kidsForm.heroDescription}
                onChange={(e) =>
                  setKidsForm((prev) => ({ ...prev, heroDescription: e.target.value }))
                }
                placeholder="Temukan ribuan buku edukatif..."
                className={inputBase}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
            <h3 className="font-semibold text-foreground">Promo Buku Anak</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="kidsPromoBadge" className="text-xs font-medium text-neutral-600">
                  Badge
                </label>
                <input
                  id="kidsPromoBadge"
                  type="text"
                  value={kidsForm.promoBadge}
                  onChange={(e) => setKidsForm((prev) => ({ ...prev, promoBadge: e.target.value }))}
                  placeholder="Spesial"
                  className={inputBase}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="kidsPromoImage" className="text-xs font-medium text-neutral-600">
                  Gambar Promo (URL)
                </label>
                <input
                  id="kidsPromoImage"
                  type="text"
                  value={kidsForm.promoImageUrl}
                  onChange={(e) =>
                    setKidsForm((prev) => ({ ...prev, promoImageUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  className={inputBase}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="kidsPromoTitle" className="text-xs font-medium text-neutral-600">
                Judul
              </label>
              <input
                id="kidsPromoTitle"
                type="text"
                value={kidsForm.promoTitle}
                onChange={(e) => setKidsForm((prev) => ({ ...prev, promoTitle: e.target.value }))}
                placeholder="Paket Hadiah Si Kecil"
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="kidsPromoDescription"
                className="text-xs font-medium text-neutral-600"
              >
                Deskripsi
              </label>
              <textarea
                id="kidsPromoDescription"
                rows={3}
                value={kidsForm.promoDescription}
                onChange={(e) =>
                  setKidsForm((prev) => ({ ...prev, promoDescription: e.target.value }))
                }
                placeholder="Dapatkan bundling buku anak..."
                className={inputBase}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-foreground">Pilih Buku Buku Anak</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {KIDS_SECTIONS.map((section) => (
                <ProductPicker
                  key={section.key}
                  label={section.label}
                  products={products}
                  selected={kidsSections[section.key]}
                  onToggle={(productId) => toggleKidsProduct(section.key, productId)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

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
