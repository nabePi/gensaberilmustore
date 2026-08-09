'use client';

import type { OrderStatus } from '@prisma/client';
import { useEffect, useState } from 'react';

import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_BADGE_CLASSES, ORDER_STATUS_LABELS } from '@/lib/order-status';
import { badgeBase, btnOutline, cardBase } from '@/lib/styles';

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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`p-4 ${cardBase}`}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laporan Penjualan</h1>
          <p className="mt-1 text-sm text-neutral-500">Ringkasan performa toko</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={btnOutline}
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
      </div>

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
                className={btnOutline}
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
                <div key={item.status} className={`flex flex-col gap-2 p-4 ${cardBase}`}>
                  <span className={`${badgeBase} ${ORDER_STATUS_BADGE_CLASSES[item.status]}`}>
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
                className={btnOutline}
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
              <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-white py-10 text-center">
                <p className="text-sm text-neutral-500">Belum ada data penjualan.</p>
              </div>
            ) : (
              <div className={`overflow-x-auto ${cardBase}`}>
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3 text-right">Terjual</th>
                      <th className="px-4 py-3 text-right">Pendapatan</th>
                      <th className="px-4 py-3">Proporsi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topProducts.map((product, index) => (
                      <tr
                        key={product.productId ?? product.title}
                        className="border-b border-neutral-100 last:border-0"
                      >
                        <td className="px-4 py-3 font-semibold text-foreground">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{product.title}</td>
                        <td className="px-4 py-3 text-right text-neutral-600">
                          {product.qty} unit
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">
                          {formatCurrency(product.revenue)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-2 w-full rounded-full bg-neutral-100">
                            <div
                              className="h-2 rounded-full bg-brand"
                              style={{ width: `${(product.revenue / maxProductRevenue) * 100}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Pesanan per Hari</h2>
              <button
                type="button"
                className={btnOutline}
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
              <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-white py-10 text-center">
                <p className="text-sm text-neutral-500">Belum ada data harian.</p>
              </div>
            ) : (
              <div className={`flex items-end gap-2 overflow-x-auto p-4 ${cardBase}`}>
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
