'use client';

import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import { Badge } from '@/components/admin/ui/Badge';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { StatCard } from '@/components/admin/ui/StatCard';
import { Table, Tbody, Td, Th, Thead, Tr } from '@/components/admin/ui/Table';
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

export default function AdminAfiliasiPage() {
  const [affiliates, setAffiliates] = useState<AffiliateListItem[]>([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(true);
  const [detail, setDetail] = useState<AffiliateDetail | null>(null);

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

  async function openDetail(affiliateId: string) {
    const response = await fetch(`/api/admin/affiliates/${affiliateId}`);
    if (response.ok) {
      setDetail(await response.json());
    }
  }

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
