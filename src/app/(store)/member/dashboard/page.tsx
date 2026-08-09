import Link from 'next/link';

import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_BADGE_CLASSES, ORDER_STATUS_LABELS } from '@/lib/order-status';
import { badgeBase, btnSolid, cardBase } from '@/lib/styles';
import { getSessionUser } from '@/server/auth';
import { orderListInclude, serializeOrderListItem } from '@/server/orders/serialize';

type AffiliateStats = {
  totalClicks: number;
  totalConversions: number;
  commissionPending: number;
  commissionPaid: number;
};

async function getAffiliateStats(userId: string): Promise<AffiliateStats | null> {
  const profile = await prisma.affiliateProfile.findUnique({ where: { userId } });
  if (!profile) return null;

  const [totalClicks, conversions] = await Promise.all([
    prisma.affiliateClick.count({ where: { affiliateProfileId: profile.id } }),
    prisma.affiliateConversion.findMany({ where: { affiliateProfileId: profile.id } }),
  ]);

  return {
    totalClicks,
    totalConversions: conversions.length,
    commissionPending: conversions
      .filter((c) => c.status === 'PENDING' || c.status === 'APPROVED')
      .reduce((sum, c) => sum + c.commissionAmount, 0),
    commissionPaid: conversions
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + c.commissionAmount, 0),
  };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`p-4 ${cardBase}`}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function QuickCard({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center p-6 text-center text-sm font-semibold text-foreground hover:border-brand hover:text-brand ${cardBase}`}
    >
      {label}
    </Link>
  );
}

export default async function MemberDashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [recentOrders, affiliateStats] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: orderListInclude,
    }),
    user.role === 'AFFILIATE' ? getAffiliateStats(user.id) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">Selamat datang, {user.name ?? user.email}</p>
      </div>

      {affiliateStats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Klik" value={affiliateStats.totalClicks.toString()} />
          <StatCard label="Total Konversi" value={affiliateStats.totalConversions.toString()} />
          <StatCard
            label="Komisi Pending"
            value={formatCurrency(affiliateStats.commissionPending)}
          />
          <StatCard label="Komisi Dibayar" value={formatCurrency(affiliateStats.commissionPaid)} />
        </div>
      ) : null}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Transaksi Terbaru</h2>
          <Link href="/member/transaksi" className="text-sm font-medium text-brand hover:underline">
            Lihat Semua &rarr;
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white py-12 text-center">
            <p className="text-sm text-neutral-500">Belum ada transaksi.</p>
            <Link href="/products" className={btnSolid}>
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentOrders.map((order) => {
              const item = serializeOrderListItem(order);
              return (
                <Link
                  key={item.id}
                  href={`/member/transaksi/${item.id}`}
                  className={`flex items-center justify-between gap-4 p-4 ${cardBase} hover:border-brand`}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.orderNumber}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}{' '}
                      · {item.itemCount} item
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`${badgeBase} ${ORDER_STATUS_BADGE_CLASSES[item.status]}`}>
                      {ORDER_STATUS_LABELS[item.status]}
                    </span>
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

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickCard href="/member/transaksi" label="Lihat Transaksi" />
        <QuickCard href="/member/afiliasi" label="Kelola Afiliasi" />
        <QuickCard href="/member/penerima" label="Daftar Penerima" />
      </div>
    </div>
  );
}
