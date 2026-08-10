'use client';

import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import { VoucherFormModal, type AdminVoucherDetail } from '@/components/admin/VoucherFormModal';
import { formatCurrency } from '@/lib/format';
import { badgeBase, btnOutline, btnSolid, btnSolidSm, cardBase, inputBase } from '@/lib/styles';

type AdminVoucherListItem = AdminVoucherDetail & {
  usedCount: number;
  createdAt: string;
};

type AdminVoucherWithStats = AdminVoucherListItem & {
  stats: { redemptionCount: number; totalDiscount: number };
};

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatValue(voucher: AdminVoucherListItem): string {
  if (voucher.type === 'PERCENT') {
    const cap = voucher.maxDiscount ? ` (maks ${formatCurrency(voucher.maxDiscount)})` : '';
    return `${voucher.value}%${cap}`;
  }
  return formatCurrency(voucher.value);
}

function formatPeriod(voucher: AdminVoucherListItem): string {
  if (!voucher.startsAt && !voucher.expiresAt) return 'Selalu berlaku';
  return `${formatDate(voucher.startsAt)} – ${formatDate(voucher.expiresAt)}`;
}

const CHANNEL_LABELS: Record<AdminVoucherListItem['channel'], string> = {
  ALL: 'Semua',
  ONLINE: 'Online',
  POS: 'POS',
};

export default function AdminVoucherPage() {
  const [vouchers, setVouchers] = useState<AdminVoucherListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [channel, setChannel] = useState('');
  const [isActive, setIsActive] = useState('');
  const [formTarget, setFormTarget] = useState<AdminVoucherDetail | 'new' | null>(null);
  const [detailTarget, setDetailTarget] = useState<AdminVoucherWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminVoucherListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadVouchers() {
    setLoading(true);
    const params = new URLSearchParams({ page: '1', limit: '60' });
    if (q.trim()) params.set('q', q.trim());
    if (channel) params.set('channel', channel);
    if (isActive) params.set('isActive', isActive);

    const response = await fetch(`/api/admin/vouchers?${params.toString()}`);
    if (response.ok) {
      const data: { items: AdminVoucherListItem[]; total: number } = await response.json();
      setVouchers(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ page: '1', limit: '60' });
      if (q.trim()) params.set('q', q.trim());
      if (channel) params.set('channel', channel);
      if (isActive) params.set('isActive', isActive);

      const response = await fetch(`/api/admin/vouchers?${params.toString()}`);
      if (response.ok) {
        const data: { items: AdminVoucherListItem[]; total: number } = await response.json();
        setVouchers(data.items);
        setTotal(data.total);
      }
      setLoading(false);
    }

    load();
  }, [q, channel, isActive]);

  async function openDetail(voucher: AdminVoucherListItem) {
    const response = await fetch(`/api/admin/vouchers/${voucher.id}`);
    if (response.ok) {
      setDetailTarget(await response.json());
    }
  }

  async function toggleActive(voucher: AdminVoucherListItem) {
    await fetch(`/api/admin/vouchers/${voucher.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !voucher.isActive }),
    });
    loadVouchers();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    const response = await fetch(`/api/admin/vouchers/${deleteTarget.id}`, { method: 'DELETE' });

    setDeleting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setDeleteError(data?.error ?? 'Gagal menghapus voucher');
      return;
    }

    setDeleteTarget(null);
    loadVouchers();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kelola Voucher</h1>
          <p className="mt-1 text-sm text-neutral-500">{total} voucher ditemukan</p>
        </div>
        <button type="button" onClick={() => setFormTarget('new')} className={btnSolid}>
          + Tambah Voucher
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          type="search"
          placeholder="Cari kode voucher"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={inputBase}
        />
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputBase}>
          <option value="">Semua Kanal</option>
          <option value="ALL">Semua (ALL)</option>
          <option value="ONLINE">Online</option>
          <option value="POS">POS</option>
        </select>
        <select
          value={isActive}
          onChange={(e) => setIsActive(e.target.value)}
          className={inputBase}
        >
          <option value="">Semua Status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat voucher...</p>
      ) : vouchers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-500">Tidak ada voucher ditemukan.</p>
        </div>
      ) : (
        <div className={`overflow-x-auto ${cardBase}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">Nilai</th>
                <th className="px-4 py-3">Kanal</th>
                <th className="px-4 py-3">Kuota</th>
                <th className="px-4 py-3">Periode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {vouchers.map((voucher) => (
                <tr
                  key={voucher.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td className="cursor-pointer px-4 py-3" onClick={() => setFormTarget(voucher)}>
                    <p className="font-medium text-foreground">{voucher.code}</p>
                    {voucher.description ? (
                      <p className="text-xs text-neutral-500">{voucher.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {voucher.type === 'PERCENT' ? 'Persentase' : 'Potongan Tetap'}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{formatValue(voucher)}</td>
                  <td className="px-4 py-3 text-neutral-600">{CHANNEL_LABELS[voucher.channel]}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {voucher.usedCount}/{voucher.quota ?? '∞'}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{formatPeriod(voucher)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`${badgeBase} ${
                        voucher.isActive
                          ? 'bg-green/10 text-green'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {voucher.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openDetail(voucher)}
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        Detail
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(voucher)}
                        className="text-sm font-medium text-neutral-600 hover:underline"
                      >
                        {voucher.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(voucher);
                        }}
                        className="text-sm font-medium text-red hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formTarget ? (
        <VoucherFormModal
          voucher={formTarget === 'new' ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            loadVouchers();
          }}
        />
      ) : null}

      {detailTarget ? (
        <AdminModal
          title={`Detail Voucher ${detailTarget.code}`}
          onClose={() => setDetailTarget(null)}
        >
          <div className="flex flex-col gap-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-neutral-100 p-3">
                <p className="text-xs text-neutral-500">Jumlah Digunakan</p>
                <p className="text-lg font-bold text-foreground">
                  {detailTarget.stats.redemptionCount}
                </p>
              </div>
              <div className="rounded-md border border-neutral-100 p-3">
                <p className="text-xs text-neutral-500">Total Diskon Diberikan</p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(detailTarget.stats.totalDiscount)}
                </p>
              </div>
            </div>
            <dl className="flex flex-col gap-1.5">
              <Row
                label="Tipe"
                value={detailTarget.type === 'PERCENT' ? 'Persentase' : 'Potongan Tetap'}
              />
              <Row label="Nilai" value={formatValue(detailTarget)} />
              <Row label="Minimal Belanja" value={formatCurrency(detailTarget.minPurchase)} />
              <Row label="Kanal" value={CHANNEL_LABELS[detailTarget.channel]} />
              <Row label="Kuota" value={`${detailTarget.usedCount}/${detailTarget.quota ?? '∞'}`} />
              <Row
                label="Batas per Pengguna"
                value={detailTarget.perUserLimit ?? 'Tidak dibatasi'}
              />
              <Row label="Periode" value={formatPeriod(detailTarget)} />
              <Row label="Status" value={detailTarget.isActive ? 'Aktif' : 'Nonaktif'} />
            </dl>
          </div>
        </AdminModal>
      ) : null}

      {deleteTarget ? (
        <AdminModal title="Hapus Voucher" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-neutral-600">
            Yakin ingin menghapus voucher <strong>{deleteTarget.code}</strong>?
          </p>
          {deleteError ? <p className="mt-2 text-sm text-red">{deleteError}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className={btnOutline}>
              Batal
            </button>
            <button type="button" disabled={deleting} onClick={handleDelete} className={btnSolidSm}>
              {deleting ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </AdminModal>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between border-b border-neutral-100 py-1.5 last:border-0">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
