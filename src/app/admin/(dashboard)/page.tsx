import Link from 'next/link';

import { Badge } from '@/components/admin/ui/Badge';
import { BarChartIcon, BoxIcon, ReceiptIcon, UsersIcon } from '@/components/admin/ui/icons';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { StatCard } from '@/components/admin/ui/StatCard';
import { ORDER_STATUS_BADGE_TONE } from '@/lib/admin/order-status';
import { adminCardBase } from '@/lib/admin/styles';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import { orderListInclude, serializeAdminOrderListItem } from '@/server/orders/serialize';
import { getAdminSummary } from '@/server/reports/summary';

function QuickCard({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center p-6 text-center text-sm font-semibold text-foreground transition-colors hover:border-brand hover:text-brand ${adminCardBase}`}
    >
      {label}
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const [summary, recentOrders] = await Promise.all([
    getAdminSummary(),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: orderListInclude,
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard Admin" description="Selamat datang di panel manajemen" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Pesanan"
          value={summary.totalOrders.toString()}
          icon={<ReceiptIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Pendapatan"
          value={formatCurrency(summary.revenue)}
          icon={<BarChartIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Total Member"
          value={summary.totalMembers.toString()}
          icon={<UsersIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Total Produk"
          value={summary.totalProducts.toString()}
          icon={<BoxIcon className="h-5 w-5" />}
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Pesanan Terbaru</h2>
          <Link href="/admin/pesanan" className="text-sm font-medium text-brand hover:underline">
            Lihat Semua &rarr;
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white py-12 text-center shadow-sm">
            <p className="text-sm text-neutral-500">Belum ada pesanan masuk.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentOrders.map((order) => {
              const item = serializeAdminOrderListItem(order);
              return (
                <Link
                  key={item.id}
                  href={`/admin/pesanan?openOrder=${item.id}`}
                  className={`flex items-center justify-between gap-4 p-4 transition-colors hover:border-brand ${adminCardBase}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.orderNumber}</p>
                    <p className="text-xs text-neutral-500">
                      {item.receiverName} ·{' '}
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge tone={ORDER_STATUS_BADGE_TONE[item.status]}>
                      {ORDER_STATUS_LABELS[item.status]}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickCard href="/admin/pesanan" label="Kelola Pesanan" />
        <QuickCard href="/admin/produk" label="Kelola Produk" />
        <QuickCard href="/admin/member" label="Lihat Member" />
        <QuickCard href="/admin/laporan" label="Lihat Laporan" />
      </div>
    </div>
  );
}
