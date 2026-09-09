'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { PageHeader } from '@/components/admin/ui/PageHeader';
import {
  adminBadgeTone,
  adminBtnOutline,
  adminBtnPrimary,
  adminCardBase,
  adminInputBase,
} from '@/lib/admin/styles';

type SectionListItem = {
  id: string;
  key: string;
  title: string;
  position: number;
  isEnabled: boolean;
  type: 'REGULAR' | 'PROMO';
};

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
  const [sections, setSections] = useState<SectionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const skipDirtyTracking = useRef(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch('/api/admin/config/homepage/sections');
      if (response.ok) {
        const data = await response.json();
        setSections(data.sections ?? []);
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

  function updateSection(index: number, patch: Partial<SectionListItem>) {
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

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);

    const response = await fetch('/api/admin/config/homepage/sections', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sections: sections.map((section, position) => ({ ...section, position })),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setSections(data.sections ?? []);
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
      <PageHeader
        title="Kelola Section"
        description="Atur urutan section dan pilih buku yang tampil di beranda."
        action={
          <Link href="/admin/konfigurasi" className={adminBtnOutline}>
            Kembali ke Konfigurasi
          </Link>
        }
      />

      <div className="flex flex-col gap-3">
        {sections.map((section, index) => (
          <div key={section.id} className={`flex items-center gap-3 p-4 ${adminCardBase}`}>
            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-600">Judul Section</label>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(index, { title: e.target.value })}
                  placeholder="Contoh: Buku Terbaru"
                  className={adminInputBase}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-600">Key (URL)</label>
                <input
                  type="text"
                  value={section.key}
                  onChange={(e) => updateSection(index, { key: normalizeKey(e.target.value) })}
                  placeholder="buku-terbaru"
                  className={adminInputBase}
                />
              </div>
            </div>

            <span className={adminBadgeTone(section.type === 'PROMO' ? 'warning' : 'neutral')}>
              {section.type === 'PROMO' ? 'Promo' : 'Reguler'}
            </span>

            <label className="flex items-center gap-2 text-xs font-medium text-neutral-600">
              <input
                type="checkbox"
                checked={section.isEnabled}
                onChange={(e) => updateSection(index, { isEnabled: e.target.checked })}
              />
              Tampil
            </label>

            <Link href={`/admin/konfigurasi/section/${section.id}`} className={adminBtnOutline}>
              Kelola Buku
            </Link>

            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => moveSection(index, -1)}
                disabled={index === 0}
                className="rounded-lg px-2 py-1 text-xs text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveSection(index, 1)}
                disabled={index === sections.length - 1}
                className="rounded-lg px-2 py-1 text-xs text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeSection(index)}
                className="rounded-lg px-2 py-1 text-xs text-red transition hover:bg-red/10"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      <Link href="/admin/konfigurasi/section/baru" className={adminBtnOutline}>
        + Tambah Section
      </Link>

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
          <button type="button" disabled={saving} onClick={handleSave} className={adminBtnPrimary}>
            {saving ? 'Menyimpan...' : 'Simpan Section'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end border-t border-neutral-200 pt-4">
          <button type="button" disabled={saving} onClick={handleSave} className={adminBtnPrimary}>
            {saving ? 'Menyimpan...' : 'Simpan Section'}
          </button>
        </div>
      )}
    </div>
  );
}
