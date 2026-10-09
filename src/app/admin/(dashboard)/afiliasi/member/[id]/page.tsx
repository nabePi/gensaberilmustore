'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import { Badge } from '@/components/admin/ui/Badge';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { StatCard } from '@/components/admin/ui/StatCard';
import { Table, Tbody, Td, Th, Thead, Tr } from '@/components/admin/ui/Table';
import {
  adminBtnOutlineSm,
  adminBtnPrimarySm,
  adminCardBase,
  adminInputBase,
} from '@/lib/admin/styles';
import { formatCurrency } from '@/lib/format';

type ConversionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
type WithdrawalStatus = 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED';

type MemberDetail = {
  profile: {
    id: string;
    code: string;
    status: 'PENDING' | 'APPROVED';
    isActive: boolean;
    joinedAt: string;
    bank: { name: string; account: string; holder: string };
  };
  user: { id: string; name: string | null; email: string; phone: string | null };
  totals: {
    clicks: number;
    conversions: number;
    completedOrders: number;
    cancelledOrders: number;
    unitsSold: number;
    salesValue: number;
    selectedProducts: number;
  };
  commission: {
    pending: number;
    earnedTotal: number;
    paidViaBatch: number;
    rejected: number;
    available: number;
    withdrawalRequested: number;
    withdrawalInProgress: number;
    withdrawalCompleted: number;
  };
  products: {
    productId: string;
    title: string;
    slug: string;
    imageUrl: string | null;
    finalPrice: number;
    isSelected: boolean;
    commission: { type: string; value: number | null } | null;
    baseCommission: { type: string; value: number | null } | null;
    isCustomCommission: boolean;
    rateStatus: string | null;
    clicks: number;
    orders: number;
    completedOrders: number;
    unitsSold: number;
    salesValue: number;
    commissionPending: number;
    totalCommission: number;
  }[];
  daily: { date: string; clicks: number; orders: number }[];
  recentConversions: {
    id: string;
    orderNumber: string;
    buyerName: string;
    orderTotal: number;
    orderStatus: string;
    commissionAmount: number;
    status: ConversionStatus;
    createdAt: string;
  }[];
  withdrawals: {
    id: string;
    amount: number;
    status: WithdrawalStatus;
    requestedAt: string;
    completedAt: string | null;
  }[];
};

const CONVERSION_LABEL: Record<ConversionStatus, string> = {
  PENDING: 'Menunggu selesai',
  APPROVED: 'Selesai',
  PAID: 'Sudah dibayar',
  REJECTED: 'Ditolak',
};
const CONVERSION_TONE = {
  PENDING: 'warning',
  APPROVED: 'success',
  PAID: 'info',
  REJECTED: 'neutral',
} as const;

const WITHDRAWAL_LABEL: Record<WithdrawalStatus, string> = {
  REQUESTED: 'Diajukan',
  IN_PROGRESS: 'Diproses',
  COMPLETED: 'Selesai',
};
const WITHDRAWAL_TONE = {
  REQUESTED: 'neutral',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
} as const;

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

function formatRate(rate: MemberDetail['products'][number]['commission']): string {
  if (!rate || rate.value === null) return '-';
  return rate.type === 'FIXED' ? `${formatCurrency(rate.value)}/item` : `${rate.value}%`;
}

function formatPercent(part: number, whole: number): string {
  if (whole === 0) return '-';
  return `${((part / whole) * 100).toFixed(1).replace('.', ',')}%`;
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`p-5 ${adminCardBase}`}>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {hint ? (
        <p className="mb-4 mt-1 text-xs text-neutral-500">{hint}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </section>
  );
}

function Bars({
  title,
  data,
  field,
}: {
  title: string;
  data: MemberDetail['daily'];
  field: 'clicks' | 'orders';
}) {
  const max = Math.max(1, ...data.map((day) => day[field]));
  const total = data.reduce((sum, day) => sum + day[field], 0);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span className="text-xs text-neutral-500">{total} dalam 30 hari</span>
      </div>
      <div
        role="img"
        aria-label={`${title}: ${total} dalam 30 hari terakhir`}
        className="mt-3 flex h-24 items-end gap-0.5"
      >
        {data.map((day) => (
          <div
            key={day.date}
            title={`${formatDay(day.date)}: ${day[field]}`}
            className="flex h-full flex-1 items-end"
          >
            <div
              className={`w-full rounded-t-sm ${day[field] > 0 ? 'bg-brand' : 'bg-neutral-200'}`}
              style={{
                height: day[field] > 0 ? `${Math.max(6, (day[field] / max) * 100)}%` : '3px',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-neutral-400">
        <span>{data[0] ? formatDay(data[0].date) : ''}</span>
        <span>{data.at(-1) ? formatDay(data.at(-1)!.date) : ''}</span>
      </div>
    </div>
  );
}

function CommissionEditor({
  memberId,
  product,
  onClose,
  onSaved,
}: {
  memberId: string;
  product: MemberDetail['products'][number];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<'PERCENT' | 'FIXED'>(
    product.commission?.type === 'FIXED' ? 'FIXED' : 'PERCENT',
  );
  const [value, setValue] = useState(String(product.commission?.value ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request(method: 'PUT' | 'DELETE') {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/affiliates/members/${memberId}/rates/${product.productId}`,
        {
          method,
          headers: { 'Content-Type': 'application/json' },
          body:
            method === 'PUT'
              ? JSON.stringify({ commissionType: type, commissionValue: Number(value) })
              : undefined,
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? 'Gagal menyimpan komisi');
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const number = Number(value);
    if (value.trim() === '' || !Number.isFinite(number) || number < 0) {
      setError('Isi komisi dengan angka 0 atau lebih');
      return;
    }
    if (type === 'PERCENT' && number > 100) {
      setError('Komisi maksimal 100%');
      return;
    }
    if (type === 'FIXED' && !Number.isInteger(number)) {
      setError('Komisi nominal harus bilangan bulat');
      return;
    }
    void request('PUT');
  }

  return (
    <AdminModal title="Ubah Komisi Member" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm" noValidate>
        <div>
          <p className="font-medium text-foreground">{product.title}</p>
          <p className="mt-1 text-xs text-neutral-500">
            Tarif produk (berlaku untuk member lain): {formatRate(product.baseCommission)}
          </p>
        </div>
        <div className="grid grid-cols-[10rem_1fr] gap-3">
          <label className="flex flex-col gap-1 font-medium text-neutral-700">
            Jenis
            <select
              value={type}
              onChange={(event) => setType(event.target.value as 'PERCENT' | 'FIXED')}
              className={adminInputBase}
            >
              <option value="PERCENT">Persen (%)</option>
              <option value="FIXED">Nominal per item (Rp)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 font-medium text-neutral-700">
            Komisi khusus member ini
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={type === 'PERCENT' ? 0.01 : 1}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className={adminInputBase}
              aria-describedby="member-commission-error"
            />
          </label>
        </div>
        <p className="text-xs text-neutral-500">
          Hanya berlaku untuk order baru. Komisi order yang sudah tercatat tidak berubah. Periode
          dan diskon pembeli tetap mengikuti pengaturan produk.
        </p>
        {error ? (
          <p id="member-commission-error" role="alert" className="text-sm text-red">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-between gap-2">
          {product.isCustomCommission ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void request('DELETE')}
              className={adminBtnOutlineSm}
            >
              Kembalikan ke tarif produk
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={adminBtnOutlineSm}>
              Batal
            </button>
            <button type="submit" disabled={busy} className={adminBtnPrimarySm}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </div>
      </form>
    </AdminModal>
  );
}

export default function AdminAfiliasiMemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<MemberDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MemberDetail['products'][number] | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/affiliates/members/${id}`);
    if (response.ok) {
      setData(await response.json());
    } else {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? 'Gagal memuat detail member');
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
        <Link href="/admin/afiliasi/member" className={adminBtnOutlineSm}>
          Kembali
        </Link>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-neutral-500">Memuat detail member...</p>;

  const { profile, user, totals, commission, products, daily } = data;
  const sellingProducts = products.filter((product) => product.orders > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={user.name ?? user.email}
        description={`${user.email}${user.phone ? ` · ${user.phone}` : ''}`}
        action={
          <Link href="/admin/afiliasi/member" className={adminBtnOutlineSm}>
            ← Daftar member
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-600">
        <span>
          Kode <span className="font-mono font-medium text-foreground">{profile.code}</span>
        </span>
        <Badge tone={profile.status === 'APPROVED' ? 'success' : 'warning'}>
          {profile.status === 'APPROVED' ? 'Disetujui' : 'Menunggu persetujuan'}
        </Badge>
        <Badge tone={profile.isActive ? 'success' : 'neutral'}>
          {profile.isActive ? 'Aktif' : 'Nonaktif'}
        </Badge>
        <span>Bergabung {formatDate(profile.joinedAt)}</span>
        <span>
          Rekening {profile.bank.name} · {profile.bank.account} (a.n. {profile.bank.holder})
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Produk Dipilih" value={String(totals.selectedProducts)} />
        <StatCard label="Total Klik" value={String(totals.clicks)} />
        <StatCard
          label="Order Lewat Link"
          value={`${totals.conversions} (${totals.completedOrders} selesai)`}
        />
        <StatCard
          label="Rasio Klik → Order"
          value={formatPercent(totals.conversions, totals.clicks)}
        />
        <StatCard label="Unit Terjual" value={String(totals.unitsSold)} />
        <StatCard label="Nilai Penjualan" value={formatCurrency(totals.salesValue)} />
        <StatCard label="Total Komisi Didapat" value={formatCurrency(commission.earnedTotal)} />
        <StatCard
          label="Komisi Menunggu Order Selesai"
          value={formatCurrency(commission.pending)}
        />
      </div>

      <Section
        title="Rekap Pencairan"
        hint="Saldo = komisi order selesai dikurangi seluruh pengajuan pencairan."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Saldo bisa dicairkan', commission.available],
            ['Diajukan (menunggu)', commission.withdrawalRequested],
            ['Sedang diproses', commission.withdrawalInProgress],
            ['Sudah dicairkan', commission.withdrawalCompleted],
          ].map(([label, amount]) => (
            <div key={label} className="rounded-lg border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">{label}</p>
              <p className="mt-1 font-semibold text-foreground">{formatCurrency(Number(amount))}</p>
            </div>
          ))}
        </div>
        {data.withdrawals.length > 0 ? (
          <div className="mt-4">
            <Table>
              <Thead>
                <Th className="text-right">Jumlah</Th>
                <Th>Diajukan</Th>
                <Th>Dicairkan</Th>
                <Th>Status</Th>
              </Thead>
              <Tbody>
                {data.withdrawals.map((w) => (
                  <Tr key={w.id}>
                    <Td className="text-right font-medium text-foreground">
                      {formatCurrency(w.amount)}
                    </Td>
                    <Td className="text-neutral-600">{formatDate(w.requestedAt)}</Td>
                    <Td className="text-neutral-600">{formatDate(w.completedAt)}</Td>
                    <Td>
                      <Badge tone={WITHDRAWAL_TONE[w.status]}>{WITHDRAWAL_LABEL[w.status]}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">Belum ada pengajuan pencairan.</p>
        )}
      </Section>

      <Section
        title="Produk yang Diafiliasikan"
        hint={`${products.length} produk, ${sellingProducts} di antaranya sudah menghasilkan order. Diurutkan dari nilai penjualan tertinggi.`}
      >
        {products.length === 0 ? (
          <p className="text-sm text-neutral-500">Member belum memilih produk.</p>
        ) : (
          <Table>
            <Thead>
              <Th>Produk</Th>
              <Th>Tarif Komisi</Th>
              <Th className="text-right">Klik</Th>
              <Th className="text-right">Order</Th>
              <Th className="text-right">Rasio</Th>
              <Th className="text-right">Unit Terjual</Th>
              <Th className="text-right">Nilai Penjualan</Th>
              <Th className="text-right">Komisi Didapat</Th>
              <Th className="text-right">Menunggu</Th>
              <Th />
            </Thead>
            <Tbody>
              {products.map((product) => (
                <Tr key={product.productId}>
                  <Td>
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-12 w-9 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-9 shrink-0 rounded bg-neutral-100" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{product.title}</p>
                        <p className="text-xs text-neutral-500">
                          {formatCurrency(product.finalPrice)}
                          {product.isSelected ? '' : ' · tidak dipilih lagi'}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-neutral-600">
                    {formatRate(product.commission)}
                    {product.isCustomCommission ? (
                      <p className="text-xs font-medium text-brand">
                        Khusus member (produk: {formatRate(product.baseCommission)})
                      </p>
                    ) : null}
                    {product.rateStatus && product.rateStatus !== 'ACTIVE' ? (
                      <p className="text-xs text-amber-700">Program tidak berjalan</p>
                    ) : null}
                  </Td>
                  <Td className="text-right text-neutral-600">{product.clicks}</Td>
                  <Td className="text-right text-neutral-600">
                    {product.orders}
                    {product.orders > 0 ? (
                      <span className="text-xs text-neutral-400"> ({product.completedOrders})</span>
                    ) : null}
                  </Td>
                  <Td className="text-right text-neutral-600">
                    {formatPercent(product.orders, product.clicks)}
                  </Td>
                  <Td className="text-right text-neutral-600">{product.unitsSold}</Td>
                  <Td className="text-right text-neutral-600">
                    {formatCurrency(product.salesValue)}
                  </Td>
                  <Td className="text-right font-semibold text-foreground">
                    {formatCurrency(product.totalCommission)}
                  </Td>
                  <Td className="text-right text-neutral-600">
                    {formatCurrency(product.commissionPending)}
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(product)}
                      className={adminBtnOutlineSm}
                    >
                      Ubah Komisi
                    </button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
        <p className="mt-3 text-xs text-neutral-400">
          Angka di kurung pada kolom Order = order yang sudah selesai. Rasio = order dibanding klik
          pada produk itu.
        </p>
      </Section>

      <Section title="Tren 30 Hari Terakhir" hint="Klik pada link dan order yang masuk per hari.">
        <div className="grid gap-6 md:grid-cols-2">
          <Bars title="Klik per Hari" data={daily} field="clicks" />
          <Bars title="Order per Hari" data={daily} field="orders" />
        </div>
      </Section>

      <Section title="Order Terbaru" hint="20 order terakhir lewat link member ini.">
        {data.recentConversions.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada order lewat link member ini.</p>
        ) : (
          <Table>
            <Thead>
              <Th>No. Pesanan</Th>
              <Th>Pembeli</Th>
              <Th className="text-right">Total Order</Th>
              <Th className="text-right">Komisi</Th>
              <Th>Status Komisi</Th>
              <Th>Tanggal</Th>
            </Thead>
            <Tbody>
              {data.recentConversions.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-mono text-xs text-neutral-700">{c.orderNumber}</Td>
                  <Td className="text-neutral-600">{c.buyerName}</Td>
                  <Td className="text-right text-neutral-600">{formatCurrency(c.orderTotal)}</Td>
                  <Td className="text-right font-medium text-foreground">
                    {formatCurrency(c.commissionAmount)}
                  </Td>
                  <Td>
                    <Badge tone={CONVERSION_TONE[c.status]}>{CONVERSION_LABEL[c.status]}</Badge>
                  </Td>
                  <Td className="text-neutral-600">{formatDate(c.createdAt)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Section>
      {editing ? (
        <CommissionEditor
          memberId={profile.id}
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
