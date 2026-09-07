'use client';

import type { OrderSource, PaymentMethod } from '@prisma/client';
import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/admin/ui/PageHeader';
import { StatCard } from '@/components/admin/ui/StatCard';
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '@/components/admin/ui/Table';
import { adminBtnOutline, adminCardBase, adminInputBase } from '@/lib/admin/styles';
import { formatCurrency } from '@/lib/format';

type Source = 'ALL' | OrderSource;

type LaporanLengkap = {
  stats: { totalRevenue: number; totalOrders: number; avgOrder: number; totalItems: number };
  revenueByMonth: { year: number; month: number; revenue: number; orders: number }[];
  sourceComparison: Record<OrderSource, { orders: number; revenue: number }>;
  categoryRevenue: { name: string; revenue: number; qty: number }[];
  paymentMethods: { method: PaymentMethod; count: number; revenue: number }[];
  topProducts: { title: string; qty: number; revenue: number }[];
};

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: 'Transfer Bank',
  EWALLET: 'E-Wallet',
  QRIS: 'QRIS',
  POS_CASH: 'Tunai (POS)',
  POS_TRANSFER: 'Transfer (POS)',
  POS_QRIS: 'QRIS (POS)',
  POS_GATEWAY: 'Payment Gateway (POS)',
};

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

export default function AdminLaporanLengkapPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [source, setSource] = useState<Source>('ALL');
  const [report, setReport] = useState<LaporanLengkap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (year) params.set('year', year);
      if (month) params.set('month', month);
      if (source !== 'ALL') params.set('source', source);
      const response = await fetch(`/api/admin/reports/laporan-lengkap?${params.toString()}`);
      if (response.ok) {
        setReport(await response.json());
      }
      setLoading(false);
    }
    load();
  }, [year, month, source]);

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
  const maxMonthlyRevenue = report
    ? Math.max(1, ...report.revenueByMonth.map((m) => m.revenue))
    : 1;
  const totalSourceRevenue = report
    ? report.sourceComparison.ONLINE.revenue + report.sourceComparison.POS.revenue
    : 0;
  const onlinePct =
    totalSourceRevenue > 0 && report
      ? Math.round((report.sourceComparison.ONLINE.revenue / totalSourceRevenue) * 100)
      : 0;
  const maxCategoryRevenue = report
    ? Math.max(1, ...report.categoryRevenue.map((c) => c.revenue))
    : 1;
  const totalPaymentRevenue = report
    ? report.paymentMethods.reduce((sum, p) => sum + p.revenue, 0)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Laporan Lengkap"
        description="Analisis mendalam untuk periode tertentu"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={adminInputBase}
            >
              <option value="">Semua Tahun</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={adminInputBase}
            >
              <option value="">Semua Bulan</option>
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as Source)}
              className={adminInputBase}
            >
              <option value="ALL">Semua Sumber</option>
              <option value="ONLINE">Online</option>
              <option value="POS">POS</option>
            </select>
            <button
              type="button"
              className={adminBtnOutline}
              onClick={() => {
                if (!report) return;
                downloadCsv('laporan-lengkap.csv', [
                  ['Metrik', 'Nilai'],
                  ['Total Pendapatan', report.stats.totalRevenue],
                  ['Total Pesanan', report.stats.totalOrders],
                  ['Rata-rata per Pesanan', report.stats.avgOrder],
                  ['Total Unit Terjual', report.stats.totalItems],
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
            <StatCard label="Total Unit Terjual" value={report.stats.totalItems.toString()} />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Pendapatan per Bulan</h2>
              <button
                type="button"
                className={adminBtnOutline}
                onClick={() =>
                  downloadCsv('pendapatan-per-bulan.csv', [
                    ['Bulan', 'Pesanan', 'Pendapatan'],
                    ...report.revenueByMonth.map((m) => [
                      `${monthName(m.month)} ${m.year}`,
                      m.orders,
                      m.revenue,
                    ]),
                  ])
                }
              >
                Export CSV
              </button>
            </div>
            {report.revenueByMonth.length === 0 ? (
              <TableEmptyState>Belum ada data pendapatan.</TableEmptyState>
            ) : (
              <>
                <div className={`flex items-end gap-3 overflow-x-auto p-4 ${adminCardBase}`}>
                  {report.revenueByMonth.map((m) => (
                    <div
                      key={`${m.year}-${m.month}`}
                      className="flex w-20 flex-shrink-0 flex-col items-center gap-1"
                    >
                      <div className="flex h-32 w-full items-end">
                        <div
                          className="w-full rounded-t bg-brand"
                          style={{
                            height: `${Math.max((m.revenue / maxMonthlyRevenue) * 100, 4)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] font-semibold text-foreground">
                        {formatCurrency(m.revenue)}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        {monthName(m.month).slice(0, 3)} {m.year}
                      </p>
                    </div>
                  ))}
                </div>
                <Table>
                  <Thead>
                    <Th>Bulan</Th>
                    <Th className="text-right">Pesanan</Th>
                    <Th className="text-right">Pendapatan</Th>
                  </Thead>
                  <Tbody>
                    {report.revenueByMonth.map((m) => (
                      <Tr key={`${m.year}-${m.month}`}>
                        <Td className="font-medium text-foreground">
                          {monthName(m.month)} {m.year}
                        </Td>
                        <Td className="text-right text-neutral-600">{m.orders} pesanan</Td>
                        <Td className="text-right font-medium text-green">
                          {formatCurrency(m.revenue)}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-foreground">Perbandingan POS vs Online</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`p-4 ${adminCardBase}`}>
                <p className="text-xs text-neutral-500">Online</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {formatCurrency(report.sourceComparison.ONLINE.revenue)}
                </p>
                <p className="text-xs text-neutral-500">
                  {report.sourceComparison.ONLINE.orders} pesanan
                </p>
              </div>
              <div className={`p-4 ${adminCardBase}`}>
                <p className="text-xs text-neutral-500">POS</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {formatCurrency(report.sourceComparison.POS.revenue)}
                </p>
                <p className="text-xs text-neutral-500">
                  {report.sourceComparison.POS.orders} pesanan
                </p>
              </div>
            </div>
            {totalSourceRevenue > 0 ? (
              <div className={`p-4 ${adminCardBase}`}>
                <p className="mb-2 text-xs text-neutral-500">Proporsi Pendapatan</p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-2 bg-brand" style={{ width: `${onlinePct}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-xs text-neutral-500">
                  <span>Online {onlinePct}%</span>
                  <span>POS {100 - onlinePct}%</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Pendapatan per Kategori</h2>
              <button
                type="button"
                className={adminBtnOutline}
                onClick={() =>
                  downloadCsv('pendapatan-per-kategori.csv', [
                    ['Kategori', 'Unit Terjual', 'Pendapatan'],
                    ...report.categoryRevenue.map((c) => [c.name, c.qty, c.revenue]),
                  ])
                }
              >
                Export CSV
              </button>
            </div>
            {report.categoryRevenue.length === 0 ? (
              <TableEmptyState>Belum ada data kategori.</TableEmptyState>
            ) : (
              <Table>
                <Thead>
                  <Th>Kategori</Th>
                  <Th className="text-right">Unit Terjual</Th>
                  <Th className="text-right">Pendapatan</Th>
                  <Th>Kontribusi</Th>
                </Thead>
                <Tbody>
                  {report.categoryRevenue.map((category) => (
                    <Tr key={category.name}>
                      <Td className="font-medium text-foreground">{category.name}</Td>
                      <Td className="text-right text-neutral-600">{category.qty} unit</Td>
                      <Td className="text-right font-medium text-green">
                        {formatCurrency(category.revenue)}
                      </Td>
                      <Td>
                        <div className="h-2 w-full rounded-full bg-neutral-100">
                          <div
                            className="h-2 rounded-full bg-brand"
                            style={{ width: `${(category.revenue / maxCategoryRevenue) * 100}%` }}
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
              <h2 className="text-lg font-semibold text-foreground">Metode Pembayaran</h2>
              <button
                type="button"
                className={adminBtnOutline}
                onClick={() =>
                  downloadCsv('metode-pembayaran.csv', [
                    ['Metode', 'Transaksi', 'Pendapatan'],
                    ...report.paymentMethods.map((p) => [
                      PAYMENT_METHOD_LABELS[p.method],
                      p.count,
                      p.revenue,
                    ]),
                  ])
                }
              >
                Export CSV
              </button>
            </div>
            {report.paymentMethods.length === 0 ? (
              <TableEmptyState>Belum ada data metode pembayaran.</TableEmptyState>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.paymentMethods.map((payment) => {
                  const pct =
                    totalPaymentRevenue > 0
                      ? Math.round((payment.revenue / totalPaymentRevenue) * 100)
                      : 0;
                  return (
                    <div
                      key={payment.method}
                      className={`flex flex-col gap-1 p-4 ${adminCardBase}`}
                    >
                      <p className="font-medium text-foreground">
                        {PAYMENT_METHOD_LABELS[payment.method]}
                      </p>
                      <p className="text-xs text-neutral-500">{payment.count} transaksi</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(payment.revenue)}
                      </p>
                      <p className="text-xs text-neutral-500">{pct}%</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Produk Terlaris</h2>
              <button
                type="button"
                className={adminBtnOutline}
                onClick={() =>
                  downloadCsv('produk-terlaris.csv', [
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
                </Thead>
                <Tbody>
                  {report.topProducts.map((product, index) => (
                    <Tr key={product.title}>
                      <Td className="font-semibold text-foreground">{index + 1}</Td>
                      <Td className="font-medium text-foreground">{product.title}</Td>
                      <Td className="text-right text-neutral-600">{product.qty} unit</Td>
                      <Td className="text-right font-medium text-foreground">
                        {formatCurrency(product.revenue)}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
