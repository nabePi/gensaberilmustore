'use client';

import { useEffect, useRef, useState } from 'react';

import { BannerImageManager, type BannerImageItem } from '@/components/admin/BannerImageManager';
import { btnSolid } from '@/lib/styles';

type BannerSlot = 'HERO_MAIN' | 'HERO_SIDE_1' | 'HERO_SIDE_2';

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
  return 'Gagal menyimpan banner. Periksa kembali data yang diisi.';
}

export default function AdminKonfigurasiPage() {
  const [banners, setBanners] = useState<Record<BannerSlot, BannerImageItem[]>>({
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
      const response = await fetch('/api/admin/config/homepage');

      if (response.ok) {
        const data = await response.json();
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
  }, [banners, loading]);

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);

    const response = await fetch('/api/admin/config/homepage', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ banners }),
    });

    if (response.ok) {
      setSaveMessage('Banner hero beranda berhasil disimpan!');
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
        <h1 className="text-2xl font-bold text-foreground">Banner Hero Beranda</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Atur banner hero yang tampil di bagian atas halaman Beranda
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
            {saving ? 'Menyimpan...' : 'Simpan Banner'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end border-t border-neutral-200 pt-4">
          <button type="button" disabled={saving} onClick={handleSave} className={btnSolid}>
            {saving ? 'Menyimpan...' : 'Simpan Banner'}
          </button>
        </div>
      )}
    </div>
  );
}
