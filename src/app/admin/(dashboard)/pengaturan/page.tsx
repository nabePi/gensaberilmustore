'use client';

import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/admin/ui/PageHeader';
import { adminBtnPrimary, adminCardBase, adminInputBase } from '@/lib/admin/styles';

export default function AdminPengaturanPage() {
  const [qrisStaticCode, setQrisStaticCode] = useState('');
  const [defaultCommissionPercent, setDefaultCommissionPercent] = useState('0');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch('/api/admin/settings/store');
      if (response.ok) {
        const data = await response.json();
        if (data.setting) {
          setQrisStaticCode(data.setting.qrisStaticCode ?? '');
          setDefaultCommissionPercent(String(data.setting.defaultCommissionPercent));
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);

    const response = await fetch('/api/admin/settings/store', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        qrisStaticCode,
        defaultCommissionPercent: Number(defaultCommissionPercent),
      }),
    });

    setSaving(false);

    if (response.ok) {
      setSaveMessage('Pengaturan berhasil disimpan!');
      return;
    }

    const data = await response.json().catch(() => null);
    const firstIssue = Object.values(data?.issues ?? {})[0] as string[] | undefined;
    setSaveMessage(firstIssue?.[0] ?? 'Gagal menyimpan pengaturan.');
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Memuat data...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pengaturan Toko" description="Konfigurasi pembayaran QRIS" />

      <div className={`flex flex-col gap-3 p-4 ${adminCardBase}`}>
        <h3 className="font-semibold text-foreground">QRIS Dinamis</h3>
        <p className="text-xs text-neutral-500">
          Tempel kode mentah (string, bukan gambar) dari QRIS statis toko. Dapatkan dengan scan QRIS
          statis cetak/kartu toko pakai aplikasi pembaca QR biasa (bukan aplikasi bank), lalu salin
          teksnya. Kalau diisi, nominal pembayaran akan otomatis muncul saat pelanggan scan QRIS di
          checkout dan POS — tidak perlu ketik manual lagi. Kosongkan untuk memakai gambar QRIS
          statis lama (nominal harus diketik manual oleh pembayar).
        </p>
        <textarea
          rows={3}
          value={qrisStaticCode}
          onChange={(e) => setQrisStaticCode(e.target.value)}
          placeholder="00020101021126...6304XXXX"
          className={`${adminInputBase} font-mono text-xs`}
        />
      </div>

      <div className={`flex flex-col gap-3 p-4 ${adminCardBase}`}>
        <h3 className="font-semibold text-foreground">Komisi Afiliasi Default</h3>
        <p className="text-xs text-neutral-500">
          Persentase komisi affiliate yang dipakai saat produk tidak punya tingkat komisi khusus
          (lihat halaman Afiliasi).
        </p>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="defaultCommissionPercent"
            className="text-xs font-medium text-neutral-600"
          >
            Persentase Komisi Default (%)
          </label>
          <input
            id="defaultCommissionPercent"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={defaultCommissionPercent}
            onChange={(e) => setDefaultCommissionPercent(e.target.value)}
            className={`${adminInputBase} max-w-xs`}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saveMessage ? <p className="text-sm text-neutral-600">{saveMessage}</p> : null}
        <button type="button" disabled={saving} onClick={handleSave} className={adminBtnPrimary}>
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>
    </div>
  );
}
