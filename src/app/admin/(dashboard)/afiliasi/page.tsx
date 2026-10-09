'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/admin/ui/Badge';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { StatCard } from '@/components/admin/ui/StatCard';
import { Table, TableEmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/ui/Table';
import { adminBtnOutlineSm } from '@/lib/admin/styles';
import { formatCurrency } from '@/lib/format';

type Overview = {
  summary: {
    affiliates: number;
    activeAffiliates: number;
    waitingApproval: number;
    clicks: number;
    conversions: number;
    completedOrders: number;
    salesValue: number;
    commissionPending: number;
    commissionEarned: number;
    withdrawalWaitingCount: number;
    withdrawalWaitingAmount: number;
    withdrawalCompletedAmount: number;
  };
  top: {
    id: string;
    code: string;
    isActive: boolean;
    status: 'PENDING' | 'APPROVED';
    name: string | null;
    email: string;
    clicks: number;
    completedOrders: number;
    salesValue: number;
    commissionEarned: number;
  }[];
};

export default function AdminAfiliasiPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/admin/affiliates/overview');
      if (response.ok) {
        setData(await response.json());
      } else {
        setError('Gagal memuat data afiliasi');
      }
      setLoading(false);
    }
    void load();
  }, []);

  const summary = data?.summary;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Performa & Komisi Afiliasi"
        description="Ringkasan seluruh program afiliasi dan afiliasi dengan komisi terbanyak"
        action={
          <Link href="/admin/afiliasi/member" className={adminBtnOutlineSm}>
            Semua member
          </Link>
        }
      />

      {error ? (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Afiliasi Aktif"
              value={`${summary.activeAffiliates} dari ${summary.affiliates}`}
            />
            <StatCard label="Total Klik" value={summary.clicks.toLocaleString('id-ID')} />
            <StatCard
              label="Order Selesai Lewat Afiliasi"
              value={`${summary.completedOrders} dari ${summary.conversions}`}
            />
            <StatCard label="Nilai Penjualan" value={formatCurrency(summary.salesValue)} />
            <StatCard
              label="Total Komisi Didapat Member"
              value={formatCurrency(summary.commissionEarned)}
            />
            <StatCard
              label="Komisi Menunggu Order Selesai"
              value={formatCurrency(summary.commissionPending)}
            />
            <StatCard
              label="Pencairan Menunggu Diproses"
              value={`${summary.withdrawalWaitingCount} · ${formatCurrency(summary.withdrawalWaitingAmount)}`}
            />
            <StatCard
              label="Sudah Dicairkan"
              value={formatCurrency(summary.withdrawalCompletedAmount)}
            />
          </div>
          {summary.waitingApproval > 0 ? (
            <p className="text-sm text-neutral-600">
              {summary.waitingApproval} pendaftar menunggu persetujuan.{' '}
              <Link
                href="/admin/afiliasi/member"
                className="font-medium text-brand hover:underline"
              >
                Tinjau
              </Link>
            </p>
          ) : null}
          {summary.withdrawalWaitingCount > 0 ? (
            <p className="text-sm text-neutral-600">
              Ada pencairan yang belum selesai.{' '}
              <Link
                href="/admin/afiliasi/pencairan"
                className="font-medium text-brand hover:underline"
              >
                Proses pencairan
              </Link>
            </p>
          ) : null}
        </>
      ) : null}

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Top 10 Afiliasi</h2>
          <p className="text-xs text-neutral-500">
            Diurutkan dari total komisi yang didapat dari order selesai.
          </p>
        </div>
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat data...</p>
        ) : !data || data.top.length === 0 ? (
          <TableEmptyState>Belum ada data afiliasi.</TableEmptyState>
        ) : (
          <Table>
            <Thead>
              <Th>#</Th>
              <Th>Member</Th>
              <Th>Kode</Th>
              <Th className="text-right">Klik</Th>
              <Th className="text-right">Order Selesai</Th>
              <Th className="text-right">Nilai Penjualan</Th>
              <Th className="text-right">Komisi Didapat</Th>
              <Th>Status</Th>
              <Th />
            </Thead>
            <Tbody>
              {data.top.map((affiliate, index) => (
                <Tr key={affiliate.id}>
                  <Td className="font-semibold text-neutral-500">{index + 1}</Td>
                  <Td>
                    <p className="font-medium text-foreground">
                      {affiliate.name ?? affiliate.email}
                    </p>
                    <p className="text-xs text-neutral-500">{affiliate.email}</p>
                  </Td>
                  <Td className="font-mono text-xs text-neutral-600">{affiliate.code}</Td>
                  <Td className="text-right text-neutral-600">{affiliate.clicks}</Td>
                  <Td className="text-right text-neutral-600">{affiliate.completedOrders}</Td>
                  <Td className="text-right text-neutral-600">
                    {formatCurrency(affiliate.salesValue)}
                  </Td>
                  <Td className="text-right font-semibold text-foreground">
                    {formatCurrency(affiliate.commissionEarned)}
                  </Td>
                  <Td>
                    {affiliate.status === 'PENDING' ? (
                      <Badge tone="warning">Menunggu</Badge>
                    ) : (
                      <Badge tone={affiliate.isActive ? 'success' : 'neutral'}>
                        {affiliate.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    <Link
                      href={`/admin/afiliasi/member/${affiliate.id}`}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      Detail
                    </Link>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
