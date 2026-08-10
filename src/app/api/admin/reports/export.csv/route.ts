import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withAuth } from '@/server/auth';
import { buildCsvResponse } from '@/server/reports/csv';
import { getOrdersByStatus } from '@/server/reports/orders-by-status';
import { getPaymentMethods } from '@/server/reports/payment-methods';
import { reportPeriodSchema } from '@/server/reports/period';
import { getPosVsOnline } from '@/server/reports/pos-vs-online';
import { getRevenueByCategory } from '@/server/reports/revenue-by-category';
import { getRevenueByMonth } from '@/server/reports/revenue-by-month';
import { getSalesByDay } from '@/server/reports/sales-by-day';
import { getReportsSummary } from '@/server/reports/summary';
import { getTopProducts } from '@/server/reports/top-products';

const querySchema = z.object({
  report: z.enum([
    'summary',
    'orders-by-status',
    'top-products',
    'sales-by-day',
    'revenue-by-month',
    'revenue-by-category',
    'payment-methods',
    'pos-vs-online',
  ]),
  period: reportPeriodSchema.default('30d'),
  source: z.enum(['ONLINE', 'POS', 'ALL']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()),
});

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { report, period, source, limit, year } = parsed.data;

    switch (report) {
      case 'summary': {
        const data = await getReportsSummary(period);
        return buildCsvResponse(
          'summary.csv',
          ['Metrik', 'Nilai'],
          [
            ['Total Pesanan', data.totalOrders],
            ['Pendapatan', data.revenue],
            ['Total Pelanggan', data.totalCustomers],
            ['Total Produk', data.totalProducts],
            ['Pesanan Tertunda', data.totalPending],
          ],
        );
      }
      case 'orders-by-status': {
        const data = await getOrdersByStatus(period, source ?? 'ALL');
        return buildCsvResponse(
          'orders-by-status.csv',
          ['Status', 'Jumlah'],
          Object.entries(data).map(([status, count]) => [status, count]),
        );
      }
      case 'top-products': {
        const data = await getTopProducts(period, limit);
        return buildCsvResponse(
          'top-products.csv',
          ['Produk', 'Kuantitas', 'Pendapatan'],
          data.items.map((item) => [item.title, item.quantity, item.revenue]),
        );
      }
      case 'sales-by-day': {
        const data = await getSalesByDay(period);
        return buildCsvResponse(
          'sales-by-day.csv',
          ['Tanggal', 'Pesanan', 'Pendapatan'],
          data.map((row) => [row.date, row.orders, row.revenue]),
        );
      }
      case 'revenue-by-month': {
        const data = await getRevenueByMonth(year, source === 'ALL' ? undefined : source);
        return buildCsvResponse(
          'revenue-by-month.csv',
          ['Bulan', 'Pesanan', 'Pendapatan'],
          data.map((row) => [row.month, row.orders, row.revenue]),
        );
      }
      case 'revenue-by-category': {
        const data = await getRevenueByCategory(period);
        return buildCsvResponse(
          'revenue-by-category.csv',
          ['Kategori', 'Kuantitas', 'Pendapatan'],
          data.map((row) => [row.name, row.quantity, row.revenue]),
        );
      }
      case 'payment-methods': {
        const data = await getPaymentMethods(period);
        return buildCsvResponse(
          'payment-methods.csv',
          ['Metode', 'Jumlah', 'Pendapatan'],
          data.map((row) => [row.method, row.count, row.revenue]),
        );
      }
      case 'pos-vs-online': {
        const data = await getPosVsOnline(period);
        return buildCsvResponse(
          'pos-vs-online.csv',
          ['Sumber', 'Pesanan', 'Pendapatan'],
          Object.entries(data).map(([sourceKey, stats]) => [
            sourceKey,
            stats.orders,
            stats.revenue,
          ]),
        );
      }
    }
  },
  { role: 'ADMIN' },
);
