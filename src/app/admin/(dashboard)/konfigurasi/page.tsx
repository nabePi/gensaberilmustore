'use client';

import type { HomepageSectionKey, KidsSectionKey } from '@prisma/client';
import { useEffect, useState } from 'react';

import { BannerImageManager, type BannerImageItem } from '@/components/admin/BannerImageManager';
import { btnSolid, inputBase } from '@/lib/styles';

type ProductOption = { id: string; title: string; sku: string };

type HomepageForm = {
  sectionNewestPromoImageUrl: string;
  sectionBestsellerPromoImageUrl: string;
  sectionInternationalPromoImageUrl: string;
  sectionKiwariPromoImageUrl: string;
  sectionKlasikPromoImageUrl: string;
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

const HOMEPAGE_SECTIONS: { key: HomepageSectionKey; label: string }[] = [
  { key: 'NEWEST', label: 'Buku Terbaru' },
  { key: 'BESTSELLER', label: 'Bestseller' },
  { key: 'INTERNATIONAL', label: 'International Bestseller' },
  { key: 'KIWARI', label: 'Keislaman Kiwari' },
  { key: 'KLASIK', label: 'Rujukan Islam Klasik' },
  { key: 'OTHERS', label: 'Lainnya' },
];

const KIDS_SECTIONS: { key: KidsSectionKey; label: string }[] = [
  { key: 'POPULAR', label: 'Buku Populer Anak' },
  { key: 'DISCOUNT', label: 'Buku Diskon' },
];

const EMPTY_HOMEPAGE_FORM: HomepageForm = {
  sectionNewestPromoImageUrl: '',
  sectionBestsellerPromoImageUrl: '',
  sectionInternationalPromoImageUrl: '',
  sectionKiwariPromoImageUrl: '',
  sectionKlasikPromoImageUrl: '',
};

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

  const [homepageForm, setHomepageForm] = useState<HomepageForm>(EMPTY_HOMEPAGE_FORM);
  const [homepageSections, setHomepageSections] = useState<Record<HomepageSectionKey, string[]>>({
    NEWEST: [],
    BESTSELLER: [],
    INTERNATIONAL: [],
    KIWARI: [],
    KLASIK: [],
    OTHERS: [],
  });

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
        if (data.config) {
          setHomepageForm({
            sectionNewestPromoImageUrl: data.config.sectionNewestPromoImageUrl,
            sectionBestsellerPromoImageUrl: data.config.sectionBestsellerPromoImageUrl,
            sectionInternationalPromoImageUrl: data.config.sectionInternationalPromoImageUrl,
            sectionKiwariPromoImageUrl: data.config.sectionKiwariPromoImageUrl,
            sectionKlasikPromoImageUrl: data.config.sectionKlasikPromoImageUrl,
          });
        }
        setHomepageSections(data.sections);
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

  function toggleHomepageProduct(key: HomepageSectionKey, productId: string) {
    setHomepageSections((prev) => {
      const current = prev[key];
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      return { ...prev, [key]: next };
    });
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

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);

    const [homepageRes, kidsRes] = await Promise.all([
      fetch('/api/admin/config/homepage', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...homepageForm, banners, sections: homepageSections }),
      }),
      fetch('/api/admin/config/kids', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...kidsForm, sections: kidsSections }),
      }),
    ]);

    setSaving(false);

    if (homepageRes.ok && kidsRes.ok) {
      setSaveMessage('Konfigurasi berhasil disimpan!');
    } else {
      setSaveMessage('Gagal menyimpan konfigurasi. Periksa kembali data yang diisi.');
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Memuat data...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Konfigurasi Tampilan</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Atur banner hero dan buku yang tampil di halaman Beranda serta Buku Anak
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

          <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
            <h3 className="font-semibold text-foreground">Gambar Promo per Section</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['sectionNewestPromoImageUrl', 'Buku Terbaru'],
                  ['sectionBestsellerPromoImageUrl', 'Bestseller'],
                  ['sectionInternationalPromoImageUrl', 'International Bestseller'],
                  ['sectionKiwariPromoImageUrl', 'Keislaman Kiwari'],
                  ['sectionKlasikPromoImageUrl', 'Rujukan Islam Klasik'],
                ] as [keyof HomepageForm, string][]
              ).map(([field, label]) => (
                <div key={field} className="flex flex-col gap-1">
                  <label htmlFor={field} className="text-xs font-medium text-neutral-600">
                    {label}
                  </label>
                  <input
                    id={field}
                    type="text"
                    value={homepageForm[field]}
                    onChange={(e) =>
                      setHomepageForm((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                    placeholder="https://..."
                    className={inputBase}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-foreground">Pilih Buku per Section</h3>
            <p className="text-xs text-neutral-500">
              Centang produk yang ingin ditampilkan. Urutan mengikuti urutan centang.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {HOMEPAGE_SECTIONS.map((section) => (
                <ProductPicker
                  key={section.key}
                  label={section.label}
                  products={products}
                  selected={homepageSections[section.key]}
                  onToggle={(productId) => toggleHomepageProduct(section.key, productId)}
                />
              ))}
            </div>
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

      <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-4">
        {saveMessage ? <p className="text-sm text-neutral-600">{saveMessage}</p> : null}
        <button type="button" disabled={saving} onClick={handleSave} className={btnSolid}>
          {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
        </button>
      </div>
    </div>
  );
}
