'use client';

import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import { Badge } from '@/components/admin/ui/Badge';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { StatCard } from '@/components/admin/ui/StatCard';
import { Table, Tbody, Td, Th, Thead, Tr } from '@/components/admin/ui/Table';
import {
  adminBtnOutline,
  adminBtnPrimary,
  adminBtnPrimarySm,
  adminInputBase,
} from '@/lib/admin/styles';
import { formatCurrency } from '@/lib/format';

type AffiliateListItem = {
  id: string;
  code: string;
  isActive: boolean;
  joinedAt: string;
  user: { id: string; name: string | null; email: string };
  totalClicks: number;
  totalConversions: number;
  commissionPending: number;
  commissionPaid: number;
};

type AffiliateDetail = {
  id: string;
  code: string;
  isActive: boolean;
  joinedAt: string;
  user: { id: string; name: string | null; email: string; phone: string | null };
  payout: { bankName: string; bankAccount: string; bankHolder: string };
  products: { productId: string; title: string; slug: string }[];
  conversions: {
    id: string;
    orderNumber: string;
    orderTotal: number;
    commissionAmount: number;
    status: string;
    createdAt: string;
  }[];
  commissionByStatus: Record<string, number>;
};

type CommissionRate = {
  productId: string;
  title: string;
  sku: string;
  finalPrice: number;
  percent: number;
  fixedAmount: number | null;
  isActive: boolean;
};

type ProductOption = { id: string; title: string; sku: string };

export default function AdminAfiliasiPage() {
  const [affiliates, setAffiliates] = useState<AffiliateListItem[]>([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(true);
  const [detail, setDetail] = useState<AffiliateDetail | null>(null);

  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [modalTarget, setModalTarget] = useState<CommissionRate | 'new' | null>(null);
  const [formProductId, setFormProductId] = useState('');
  const [formPercent, setFormPercent] = useState('10');
  const [formEnabled, setFormEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadRates() {
    setLoadingRates(true);
    const response = await fetch('/api/admin/commission-rates');
    if (response.ok) {
      const data: { items: CommissionRate[] } = await response.json();
      setRates(data.items);
    }
    setLoadingRates(false);
  }

  useEffect(() => {
    async function load() {
      setLoadingAffiliates(true);
      const response = await fetch('/api/admin/affiliates?limit=50');
      if (response.ok) {
        const data: { items: AffiliateListItem[] } = await response.json();
        setAffiliates(data.items);
      }
      setLoadingAffiliates(false);
    }
    load();
  }, []);

  useEffect(() => {
    async function load() {
      setLoadingRates(true);
      const response = await fetch('/api/admin/commission-rates');
      if (response.ok) {
        const data: { items: CommissionRate[] } = await response.json();
        setRates(data.items);
      }
      setLoadingRates(false);
    }
    load();
  }, []);

  useEffect(() => {
    fetch('/api/admin/products?limit=60')
      .then((res) => res.json())
      .then((data: { items: ProductOption[] }) => setProducts(data.items));
  }, []);

  async function openDetail(affiliateId: string) {
    const response = await fetch(`/api/admin/affiliates/${affiliateId}`);
    if (response.ok) {
      setDetail(await response.json());
    }
  }

  function openAddRate() {
    setModalTarget('new');
    setFormProductId('');
    setFormPercent('10');
    setFormEnabled(true);
    setFormError(null);
  }

  function openEditRate(rate: CommissionRate) {
    setModalTarget(rate);
    setFormProductId(rate.productId);
    setFormPercent(String(rate.percent));
    setFormEnabled(rate.isActive);
    setFormError(null);
  }

  async function handleSaveRate() {
    if (!formProductId) {
      setFormError('Pilih produk terlebih dahulu');
      return;
    }
    const percent = Number(formPercent);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      setFormError('Persentase harus antara 0-100');
      return;
    }

    setSaving(true);
    setFormError(null);

    const response = await fetch(`/api/admin/commission-rates/${formProductId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ percent, isActive: formEnabled }),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setFormError(data?.error ?? 'Gagal menyimpan tingkat komisi');
      return;
    }

    setModalTarget(null);
    loadRates();
  }

  const availableProducts = products.filter(
    (product) => modalTarget === 'new' || product.id === formProductId,
  );
  const unratedProducts = products.filter(
    (product) => !rates.some((rate) => rate.productId === product.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kelola Afiliasi"
        description="Performa dan komisi afiliasi semua member"
        action={
          <span className="text-sm font-medium text-neutral-500">{affiliates.length} afiliasi</span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Afiliasi" value={affiliates.length.toString()} />
        <StatCard
          label="Total Klik"
          value={affiliates.reduce((sum, a) => sum + a.totalClicks, 0).toString()}
        />
        <StatCard
          label="Total Konversi"
          value={affiliates.reduce((sum, a) => sum + a.totalConversions, 0).toString()}
        />
        <StatCard
          label="Komisi Pending"
          value={formatCurrency(affiliates.reduce((sum, a) => sum + a.commissionPending, 0))}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Performa Afiliasi</h2>
        {loadingAffiliates ? (
          <p className="text-sm text-neutral-500">Memuat data...</p>
        ) : affiliates.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-white py-10 text-center">
            <p className="text-sm text-neutral-500">Belum ada data afiliasi.</p>
          </div>
        ) : (
          <Table>
            <Thead>
              <Th>Member</Th>
              <Th>Kode</Th>
              <Th className="text-right">Klik</Th>
              <Th className="text-right">Konversi</Th>
              <Th className="text-right">Komisi Pending</Th>
              <Th className="text-right">Komisi Dibayar</Th>
              <Th>Status</Th>
              <Th />
            </Thead>
            <Tbody>
              {affiliates.map((affiliate) => (
                <Tr key={affiliate.id}>
                  <Td>
                    <p className="font-medium text-foreground">
                      {affiliate.user.name ?? affiliate.user.email}
                    </p>
                    <p className="text-xs text-neutral-500">{affiliate.user.email}</p>
                  </Td>
                  <Td className="font-mono text-xs text-neutral-600">{affiliate.code}</Td>
                  <Td className="text-right text-neutral-600">{affiliate.totalClicks}</Td>
                  <Td className="text-right text-neutral-600">{affiliate.totalConversions}</Td>
                  <Td className="text-right text-neutral-600">
                    {formatCurrency(affiliate.commissionPending)}
                  </Td>
                  <Td className="text-right text-neutral-600">
                    {formatCurrency(affiliate.commissionPaid)}
                  </Td>
                  <Td>
                    <Badge tone={affiliate.isActive ? 'success' : 'neutral'}>
                      {affiliate.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(affiliate.id)}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      Detail
                    </button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Tingkat Komisi per Produk</h2>
        <p className="text-sm text-neutral-500">
          Atur produk mana saja yang tersedia untuk program afiliasi beserta tingkat komisinya.
        </p>
        <div className="flex items-center justify-between">
          <span />
          <button type="button" onClick={openAddRate} className={adminBtnPrimarySm}>
            + Tambah Produk
          </button>
        </div>

        {loadingRates ? (
          <p className="text-sm text-neutral-500">Memuat data...</p>
        ) : rates.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-white py-10 text-center">
            <p className="text-sm text-neutral-500">
              Belum ada produk afiliasi. Klik &quot;Tambah Produk&quot; untuk menambahkan.
            </p>
          </div>
        ) : (
          <Table>
            <Thead>
              <Th>Produk</Th>
              <Th className="text-right">Komisi</Th>
              <Th>Status</Th>
              <Th />
            </Thead>
            <Tbody>
              {rates.map((rate) => (
                <Tr key={rate.productId}>
                  <Td>
                    <p className="font-medium text-foreground">{rate.title}</p>
                    <p className="text-xs text-neutral-500">{rate.sku}</p>
                  </Td>
                  <Td className="text-right text-neutral-600">{rate.percent}%</Td>
                  <Td>
                    <Badge tone={rate.isActive ? 'success' : 'neutral'}>
                      {rate.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => openEditRate(rate)}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      Edit
                    </button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {modalTarget ? (
        <AdminModal
          title={modalTarget === 'new' ? 'Tambah Produk Afiliasi' : 'Edit Produk Afiliasi'}
          onClose={() => setModalTarget(null)}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="affProductSelect" className="text-xs font-medium text-neutral-600">
                Pilih Produk
              </label>
              <select
                id="affProductSelect"
                value={formProductId}
                onChange={(e) => setFormProductId(e.target.value)}
                disabled={modalTarget !== 'new'}
                className={adminInputBase}
              >
                <option value="">Pilih produk</option>
                {(modalTarget === 'new' ? unratedProducts : availableProducts).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title} ({product.sku})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="affProductRate" className="text-xs font-medium text-neutral-600">
                Tingkat Komisi (%)
              </label>
              <input
                id="affProductRate"
                type="number"
                min={0}
                max={100}
                value={formPercent}
                onChange={(e) => setFormPercent(e.target.value)}
                className={adminInputBase}
              />
              <p className="text-xs text-neutral-500">
                Persentase komisi yang diterima affiliate per penjualan (0-100%)
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={formEnabled}
                onChange={(e) => setFormEnabled(e.target.checked)}
              />
              Aktifkan untuk afiliasi
            </label>

            {formError ? <p className="text-sm text-red">{formError}</p> : null}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setModalTarget(null)} className={adminBtnOutline}>
              Batal
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveRate}
              className={adminBtnPrimary}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </AdminModal>
      ) : null}

      {detail ? (
        <AdminModal
          title={`Detail Afiliasi - ${detail.user.name ?? detail.user.email}`}
          onClose={() => setDetail(null)}
          widthClassName="max-w-2xl"
        >
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-neutral-500">Kode Afiliasi</p>
                <p className="font-mono font-medium text-foreground">{detail.code}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Bergabung</p>
                <p className="font-medium text-foreground">
                  {new Date(detail.joinedAt).toLocaleDateString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Rekening Pembayaran</p>
                <p className="font-medium text-foreground">
                  {detail.payout.bankName} · {detail.payout.bankAccount} ({detail.payout.bankHolder}
                  )
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Telepon</p>
                <p className="font-medium text-foreground">{detail.user.phone ?? '-'}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 font-semibold text-foreground">Breakdown Komisi</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(detail.commissionByStatus).map(([status, amount]) => (
                  <div key={status} className="rounded-lg border border-neutral-200 p-2">
                    <p className="text-xs text-neutral-500">{status}</p>
                    <p className="font-medium text-foreground">{formatCurrency(amount)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 font-semibold text-foreground">Produk Pilihan</p>
              {detail.products.length === 0 ? (
                <p className="text-neutral-500">Belum memilih produk.</p>
              ) : (
                <ul className="list-disc pl-5 text-neutral-600">
                  {detail.products.map((product) => (
                    <li key={product.productId}>{product.title}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 font-semibold text-foreground">Riwayat Konversi</p>
              {detail.conversions.length === 0 ? (
                <p className="text-neutral-500">Belum ada konversi.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-neutral-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 text-neutral-500">
                      <tr>
                        <th className="px-3 py-2">No. Pesanan</th>
                        <th className="px-3 py-2 text-right">Komisi</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.conversions.map((conversion) => (
                        <tr key={conversion.id} className="border-t border-neutral-100">
                          <td className="px-3 py-2">{conversion.orderNumber}</td>
                          <td className="px-3 py-2 text-right">
                            {formatCurrency(conversion.commissionAmount)}
                          </td>
                          <td className="px-3 py-2">{conversion.status}</td>
                          <td className="px-3 py-2">
                            {new Date(conversion.createdAt).toLocaleDateString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </AdminModal>
      ) : null}
    </div>
  );
}
