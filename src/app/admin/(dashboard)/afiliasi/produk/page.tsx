'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import {
  CHANNEL_LABEL,
  Cover,
  RateSettingsFields,
  type RateFormState,
  saveAffiliateProduct,
  toDateInput,
  type ValueType,
} from '@/components/admin/affiliate-product/shared';
import { Badge } from '@/components/admin/ui/Badge';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Table, TableEmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/ui/Table';
import {
  adminBtnOutline,
  adminBtnOutlineSm,
  adminBtnPrimary,
  adminInputBase,
} from '@/lib/admin/styles';
import { formatCurrency } from '@/lib/format';

type RateStatus = 'ACTIVE' | 'INACTIVE' | 'SCHEDULED' | 'EXPIRED';

type AffiliateProduct = {
  productId: string;
  title: string;
  sku: string;
  finalPrice: number;
  channel: 'WEB' | 'POS' | 'BOTH';
  primaryImageUrl: string | null;
  commissionType: ValueType;
  commissionValue: number;
  discountType: ValueType | null;
  discountValue: number | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  status: RateStatus;
};

const STATUS_BADGE: Record<
  RateStatus,
  { label: string; tone: 'success' | 'neutral' | 'info' | 'warning' }
> = {
  ACTIVE: { label: 'Aktif', tone: 'success' },
  INACTIVE: { label: 'Nonaktif', tone: 'neutral' },
  SCHEDULED: { label: 'Terjadwal', tone: 'info' },
  EXPIRED: { label: 'Berakhir', tone: 'warning' },
};

function formatValue(type: ValueType, value: number) {
  return type === 'PERCENT' ? `${value}%` : formatCurrency(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPeriod(item: AffiliateProduct) {
  if (!item.startsAt && !item.endsAt) return 'Selamanya';
  const start = item.startsAt ? formatDate(item.startsAt) : 'Sekarang';
  const end = item.endsAt ? formatDate(item.endsAt) : 'Sampai dihentikan';
  return `${start} – ${end}`;
}

export default function AdminProdukAfiliasiPage() {
  const [items, setItems] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');

  const [modal, setModal] = useState<AffiliateProduct | null>(null);
  const [form, setForm] = useState<RateFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AffiliateProduct | 'bulk' | null>(null);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set('q', q);
      const response = await fetch(`/api/admin/commission-rates?${params.toString()}`);
      if (response.ok) {
        const data: { items: AffiliateProduct[]; total: number } = await response.json();
        setItems(data.items);
        setTotal(data.total);
        setSelectedIds([]);
        setError(null);
      } else {
        setError('Gagal memuat produk afiliasi');
      }
      setLoading(false);
    }
    load();
  }, [q, page, limit, reloadKey]);

  function patchForm(patch: Partial<RateFormState>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function openEdit(item: AffiliateProduct) {
    setForm({
      commissionType: item.commissionType,
      commissionValue: String(item.commissionValue ?? ''),
      hasDiscount: item.discountType !== null,
      discountType: item.discountType ?? 'PERCENT',
      discountValue: item.discountValue !== null ? String(item.discountValue) : '',
      forever: !item.startsAt && !item.endsAt,
      startsAt: toDateInput(item.startsAt),
      endsAt: toDateInput(item.endsAt),
      isActive: item.isActive,
    });
    setFormError(null);
    setModal(item);
  }

  async function handleSave() {
    if (!modal || !form) return;
    setSaving(true);
    setFormError(null);
    const message = await saveAffiliateProduct(modal.productId, form);
    setSaving(false);
    if (message) {
      setFormError(message);
      return;
    }
    setModal(null);
    setReloadKey((key) => key + 1);
  }

  async function toggleActive(item: AffiliateProduct) {
    setBusyId(item.productId);
    setError(null);
    const message = await saveAffiliateProduct(item.productId, {
      commissionType: item.commissionType,
      commissionValue: String(item.commissionValue ?? 0),
      hasDiscount: item.discountType !== null,
      discountType: item.discountType ?? 'PERCENT',
      discountValue: item.discountValue !== null ? String(item.discountValue) : '',
      forever: !item.startsAt && !item.endsAt,
      startsAt: toDateInput(item.startsAt),
      endsAt: toDateInput(item.endsAt),
      isActive: !item.isActive,
    });
    setBusyId(null);
    if (message) setError(message);
    else setReloadKey((key) => key + 1);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const productIds = deleteTarget === 'bulk' ? selectedIds : [deleteTarget.productId];
    setBusyId(deleteTarget === 'bulk' ? 'bulk' : deleteTarget.productId);
    const response = await fetch('/api/admin/commission-rates', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productIds }),
    });
    setBusyId(null);
    if (!response.ok) {
      setError('Gagal menghapus produk afiliasi');
    } else {
      if (items.length === productIds.length && page > 1) setPage((p) => p - 1);
      setReloadKey((key) => key + 1);
    }
    setDeleteTarget(null);
  }

  const allSelected = items.length > 0 && items.every((i) => selectedIds.includes(i.productId));
  const someSelected = selectedIds.length > 0 && !allSelected;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  function toggleAll() {
    setSelectedIds(allSelected ? [] : items.map((i) => i.productId));
  }

  function toggleOne(productId: string) {
    setSelectedIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Produk Afiliasi"
        description="Pilih produk yang bisa diafiliasikan, atur komisi, diskon pembeli, dan periodenya"
        action={
          <Link
            href="/admin/afiliasi/produk/baru"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
          >
            + Tambah Produk
          </Link>
        }
      />

      <input
        type="search"
        aria-label="Cari produk afiliasi"
        placeholder="Cari nama produk atau SKU"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className={`${adminInputBase} sm:w-80`}
      />

      {error ? (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      ) : null}

      {selectedIds.length > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-brand">{selectedIds.length} produk dipilih</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelectedIds([])} className={adminBtnOutlineSm}>
              Batal pilih
            </button>
            <button
              type="button"
              disabled={busyId === 'bulk'}
              onClick={() => setDeleteTarget('bulk')}
              className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              Hapus terpilih
            </button>
          </div>
        </div>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="text-sm text-neutral-500">Memuat produk afiliasi...</p>
      ) : items.length === 0 ? (
        <TableEmptyState>
          Belum ada produk afiliasi. Klik &quot;Tambah Produk&quot; untuk memulai.
        </TableEmptyState>
      ) : (
        <Table>
          <Thead>
            <Th className="w-10">
              <input
                type="checkbox"
                aria-label="Pilih semua produk di halaman ini"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
              />
            </Th>
            <Th>Produk</Th>
            <Th>Komisi</Th>
            <Th>Diskon Pembeli</Th>
            <Th>Periode</Th>
            <Th>Status</Th>
            <Th />
          </Thead>
          <Tbody>
            {items.map((item) => {
              const badge = STATUS_BADGE[item.status];
              return (
                <Tr
                  key={item.productId}
                  className={selectedIds.includes(item.productId) ? 'bg-brand-50/50' : ''}
                >
                  <Td>
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${item.title}`}
                      checked={selectedIds.includes(item.productId)}
                      onChange={() => toggleOne(item.productId)}
                    />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Cover url={item.primaryImageUrl} className="h-14 w-10 shrink-0 rounded-sm" />
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-neutral-500">
                          {item.sku} · {CHANNEL_LABEL[item.channel]} ·{' '}
                          {formatCurrency(item.finalPrice)}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-neutral-600">
                    {formatValue(item.commissionType, item.commissionValue ?? 0)}
                    {item.commissionType === 'FIXED' ? ' / unit' : ''}
                  </Td>
                  <Td className="text-neutral-600">
                    {item.discountType && item.discountValue !== null
                      ? `${formatValue(item.discountType, item.discountValue)}${item.discountType === 'FIXED' ? ' / unit' : ''}`
                      : '-'}
                  </Td>
                  <Td className="text-xs text-neutral-600">{formatPeriod(item)}</Td>
                  <Td>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busyId === item.productId}
                        onClick={() => toggleActive(item)}
                        className={adminBtnOutlineSm}
                      >
                        {item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className={adminBtnOutlineSm}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="text-xs font-medium text-red hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <label htmlFor="affProdLimit">Tampilkan</label>
          <select
            id="affProdLimit"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className={`${adminInputBase} !h-9 !w-20 !px-2 !py-1`}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>
            {from}–{to} dari {total}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className={adminBtnOutlineSm}
          >
            Sebelumnya
          </button>
          <span className="text-sm text-neutral-600">
            Halaman {page} dari {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className={adminBtnOutlineSm}
          >
            Berikutnya
          </button>
        </div>
      </div>

      {modal && form ? (
        <AdminModal
          title="Edit Produk Afiliasi"
          onClose={() => setModal(null)}
          widthClassName="max-w-2xl"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Cover url={modal.primaryImageUrl} className="h-16 w-12 shrink-0 rounded-sm" />
              <div>
                <p className="text-xs font-medium text-neutral-600">Produk</p>
                <p className="text-sm font-medium text-foreground">{modal.title}</p>
                <p className="text-xs text-neutral-500">{modal.sku}</p>
              </div>
            </div>

            <RateSettingsFields form={form} onChange={patchForm} />

            {formError ? (
              <p role="alert" className="text-sm text-red">
                {formError}
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className={adminBtnOutline}>
              Batal
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className={adminBtnPrimary}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </AdminModal>
      ) : null}

      {deleteTarget ? (
        <AdminModal title="Hapus Produk Afiliasi" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-neutral-600">
            {deleteTarget === 'bulk'
              ? `Hapus ${selectedIds.length} produk terpilih dari program afiliasi?`
              : `Hapus "${deleteTarget.title}" dari program afiliasi?`}{' '}
            Komisi dan diskon produk ini tidak berlaku lagi untuk pesanan berikutnya.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className={adminBtnOutline}>
              Batal
            </button>
            <button type="button" onClick={confirmDelete} className={adminBtnPrimary}>
              Hapus
            </button>
          </div>
        </AdminModal>
      ) : null}
    </div>
  );
}
