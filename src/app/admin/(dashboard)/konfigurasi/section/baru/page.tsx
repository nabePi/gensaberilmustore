'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PageHeader } from '@/components/admin/ui/PageHeader';
import {
  adminBtnOutline,
  adminBtnPrimary,
  adminCardBase,
  adminInputBase,
} from '@/lib/admin/styles';

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

export default function AdminKonfigurasiSectionBaruPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [key, setKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const response = await fetch('/api/admin/config/homepage/sections', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, key }),
    });

    if (response.ok) {
      const data: { id: string } = await response.json();
      router.push(`/admin/konfigurasi/section/${data.id}`);
      return;
    }

    const data = await response.json().catch(() => null);
    const issues = data?.issues as Record<string, string[]> | undefined;
    setError(
      issues
        ? Object.entries(issues)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join(' · ')
        : (data?.error ?? 'Gagal membuat section'),
    );
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tambah Section"
        breadcrumb={[
          { label: 'Section', href: '/admin/konfigurasi/section' },
          { label: 'Tambah Section' },
        ]}
      />

      <div className={`flex max-w-lg flex-col gap-4 p-4 ${adminCardBase}`}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600">Judul Section</label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!keyTouched) setKey(normalizeKey(e.target.value));
            }}
            placeholder="Contoh: Buku Terbaru"
            className={adminInputBase}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600">Key (URL)</label>
          <input
            type="text"
            value={key}
            onChange={(e) => {
              setKeyTouched(true);
              setKey(normalizeKey(e.target.value));
            }}
            placeholder="buku-terbaru"
            className={adminInputBase}
          />
        </div>

        {error ? <p className="text-sm text-red">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push('/admin/konfigurasi/section')}
            className={adminBtnOutline}
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving || !title.trim() || !key.trim()}
            onClick={handleSave}
            className={adminBtnPrimary}
          >
            {saving ? 'Menyimpan...' : 'Simpan & Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
}
