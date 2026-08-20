'use client';

import { useEffect, useRef, useState } from 'react';

import { BannerImageManager, type BannerImageItem } from '@/components/admin/BannerImageManager';
import { btnSolid, inputBase } from '@/lib/styles';

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

export default function AdminKonfigurasiKidsPage() {
  const [kidsForm, setKidsForm] = useState<KidsForm>(EMPTY_KIDS_FORM);
  const [banners, setBanners] = useState<BannerImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const skipDirtyTracking = useRef(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch('/api/admin/config/kids');
      if (response.ok) {
        const data = await response.json();
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
        setBanners(data.banners ?? []);
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
  }, [kidsForm, banners, loading]);

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);

    const response = await fetch('/api/admin/config/kids', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...kidsForm,
        heroImageUrl: banners[0]?.imageUrl ?? kidsForm.heroImageUrl,
        banners,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setBanners(data.banners ?? []);
      setSaveMessage('Konfigurasi Kids berhasil disimpan!');
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
        <h1 className="text-2xl font-bold text-foreground">Konfigurasi Kids</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Atur banner, hero, dan promo yang tampil di halaman Buku Anak
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
        <h3 className="font-semibold text-foreground">Hero Buku Anak</h3>
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
        <BannerImageManager label="Gambar Hero" images={banners} onChange={setBanners} />
        <p className="-mt-2 text-xs text-neutral-500">
          Bisa upload lebih dari satu gambar. Jika lebih dari satu, gambar hero bergeser otomatis
          (carousel) tanpa navigasi. Isi URL agar gambar bisa diklik (opsional).
        </p>
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
            onChange={(e) => setKidsForm((prev) => ({ ...prev, heroDescription: e.target.value }))}
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
              onChange={(e) => setKidsForm((prev) => ({ ...prev, promoImageUrl: e.target.value }))}
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
          <label htmlFor="kidsPromoDescription" className="text-xs font-medium text-neutral-600">
            Deskripsi
          </label>
          <textarea
            id="kidsPromoDescription"
            rows={3}
            value={kidsForm.promoDescription}
            onChange={(e) => setKidsForm((prev) => ({ ...prev, promoDescription: e.target.value }))}
            placeholder="Dapatkan bundling buku anak..."
            className={inputBase}
          />
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
