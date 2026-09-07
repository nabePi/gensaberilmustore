'use client';

import type { OrderStatus } from '@prisma/client';
import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/admin/ui/PageHeader';
import { StatCard } from '@/components/admin/ui/StatCard';
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '@/components/admin/ui/Table';
import { adminBadgeBase, adminBtnOutline, adminCardBase, adminInputBase } from '@/lib/admin/styles';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_BADGE_CLASSES, ORDER_STATUS_LABELS } from '@/lib/order-status';

type Period = 'all' | 'today' | 'week' | 'month';

type LaporanReport = {
  stats: { totalRevenue: number; totalOrders: number; avgOrder: number; completedRate: number };
  statusBreakdown: { status: OrderStatus; count: number }[];
  topProducts: { productId: string | null; title: string; qty: number; revenue: number }[];
  salesByDay: { date: string; count: number }[];
};

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'Semua Waktu', value: 'all' },
  { label: 'Hari Ini', value: 'today' },
  { label: '7 Hari Terakhir', value: 'week' },
  { label: 'Bulan Ini', value: 'month' },
];

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminLaporanPage() {
  const [period, setPeriod] = useState<Period>('all');
  const [report, setReport] = useState<LaporanReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch(`/api/admin/reports/laporan?period=${period}`);
      if (response.ok) {
        setReport(await response.json());
      }
      setLoading(false);
    }
    load();
  }, [period]);

  const maxDaily = report ? Math.max(1, ...report.salesByDay.map((d) => d.count)) : 1;
  const maxProductRevenue = report ? Math.max(1, ...report.topProducts.map((p) => p.revenue)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Laporan Penjualan"
        description="Ringkasan performa toko"
        action={
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className={adminInputBase}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={adminBtnOutline}
              onClick={() => {
                if (!report) return;
                downloadCsv('laporan-penjualan.csv', [
                  ['Metrik', 'Nilai'],
                  ['Total Pendapatan', report.stats.totalRevenue],
                  ['Total Pesanan', report.stats.totalOrders],
                  ['Rata-rata per Pesanan', report.stats.avgOrder],
                  ['Tingkat Selesai (%)', (report.stats.completedRate * 100).toFixed(1)],
                ]);
              }}
            >
              Export CSV
            </button>
          </div>
        }
      />

      {loading || !report ? (
        <p className="text-sm text-neutral-500">Memuat data...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Pendapatan" value={formatCurrency(report.stats.totalRevenue)} />
            <StatCard label="Total Pesanan" value={report.stats.totalOrders.toString()} />
            <StatCard label="Rata-rata per Pesanan" value={formatCurrency(report.stats.avgOrder)} />
            <StatCard
              label="Tingkat Selesai"
              value={`${(report.stats.completedRate * 100).toFixed(1)}%`}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Status Pesanan</h2>
              <button
                type="button"
                className={adminBtnOutline}
                onClick={() =>
                  downloadCsv('status-pesanan.csv', [
                    ['Status', 'Jumlah'],
                    ...report.statusBreakdown.map((s) => [ORDER_STATUS_LABELS[s.status], s.count]),
                  ])
                }
              >
                Export CSV
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {report.statusBreakdown.map((item) => (
                <div key={item.status} className={`flex flex-col gap-2 p-4 ${adminCardBase}`}>
                  <span className={`${adminBadgeBase} ${ORDER_STATUS_BADGE_CLASSES[item.status]}`}>
                    {ORDER_STATUS_LABELS[item.status]}
                  </span>
                  <p className="text-xl font-bold text-foreground">{item.count}</p>
                  <p className="text-xs text-neutral-500">pesanan</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Top Produk Terjual</h2>
              <button
                type="button"
                className={adminBtnOutline}
                onClick={() =>
                  downloadCsv('top-produk.csv', [
                    ['#', 'Produk', 'Terjual', 'Pendapatan'],
                    ...report.topProducts.map((p, i) => [i + 1, p.title, p.qty, p.revenue]),
                  ])
                }
              >
                Export CSV
              </button>
            </div>
            {report.topProducts.length === 0 ? (
              <TableEmptyState>Belum ada data penjualan.</TableEmptyState>
            ) : (
              <Table>
                <Thead>
                  <Th>#</Th>
                  <Th>Produk</Th>
                  <Th className="text-right">Terjual</Th>
                  <Th className="text-right">Pendapatan</Th>
                  <Th>Proporsi</Th>
                </Thead>
                <Tbody>
                  {report.topProducts.map((product, index) => (
                    <Tr key={product.productId ?? product.title}>
                      <Td className="font-semibold text-foreground">{index + 1}</Td>
                      <Td className="font-medium text-foreground">{product.title}</Td>
                      <Td className="text-right text-neutral-600">{product.qty} unit</Td>
                      <Td className="text-right font-medium text-foreground">
                        {formatCurrency(product.revenue)}
                      </Td>
                      <Td>
                        <div className="h-2 w-full rounded-full bg-neutral-100">
                          <div
                            className="h-2 rounded-full bg-brand"
                            style={{ width: `${(product.revenue / maxProductRevenue) * 100}%` }}
                          />
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Pesanan per Hari</h2>
              <button
                type="button"
                className={adminBtnOutline}
                onClick={() =>
                  downloadCsv('pesanan-per-hari.csv', [
                    ['Tanggal', 'Jumlah Pesanan'],
                    ...report.salesByDay.map((d) => [d.date, d.count]),
                  ])
                }
              >
                Export CSV
              </button>
            </div>
            {report.salesByDay.length === 0 ? (
              <TableEmptyState>Belum ada data harian.</TableEmptyState>
            ) : (
              <div className={`flex items-end gap-2 overflow-x-auto p-4 ${adminCardBase}`}>
                {report.salesByDay.map((day) => (
                  <div
                    key={day.date}
                    className="flex w-16 flex-shrink-0 flex-col items-center gap-1"
                  >
                    <div className="flex h-32 w-full items-end">
                      <div
                        className="w-full rounded-t bg-brand"
                        style={{ height: `${Math.max((day.count / maxDaily) * 100, 4)}%` }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-foreground">{day.count}</p>
                    <p className="text-[10px] text-neutral-500">
                      {new Date(day.date).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
