'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { formatCurrency } from '@/lib/format';
import { getOrderStatusBadgeClass, getOrderStatusLabel } from '@/lib/order-status';
import { badgeBase, btnOutline, cardBase } from '@/lib/styles';

type ValueType = 'PERCENT' | 'FIXED';
type OrderStatus = 'AWAITING_PAYMENT' | 'PAID' | 'PACKED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

type ProductAnalysis = {
  product: {
    id: string;
    title: string;
    slug: string;
    finalPrice: number;
    imageUrl: string | null;
    commission: { type: ValueType; value: number } | null;
    buyerDiscount: { type: ValueType; value: number } | null;
    rateStatus: 'ACTIVE' | 'INACTIVE' | 'SCHEDULED' | 'EXPIRED' | null;
  };
  totals: {
    clicks: number;
    orders: {
      total: number;
      awaitingPayment: number;
      processing: number;
      completed: number;
      cancelled: number;
    };
    unitsSold: number;
    salesValue: number;
    commissionPending: number;
    commissionEarned: number;
    commissionPaid: number;
  };
  daily: { date: string; clicks: number; orders: number }[];
  recentOrders: {
    orderNumber: string;
    createdAt: string;
    orderStatus: OrderStatus;
    quantity: number;
    lineTotal: number;
    commission: number;
  }[];
};

function formatAmount(type: ValueType, value: number) {
  return type === 'PERCENT' ? `${value}%` : `${formatCurrency(value)}/item`;
}

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className={`p-4 ${cardBase}`}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
      <p className="mt-1.5 text-xs leading-snug text-neutral-400">{hint}</p>
    </div>
  );
}

function DailyBars({
  title,
  hint,
  data,
  field,
}: {
  title: string;
  hint: string;
  data: ProductAnalysis['daily'];
  field: 'clicks' | 'orders';
}) {
  const max = Math.max(1, ...data.map((day) => day[field]));
  const total = data.reduce((sum, day) => sum + day[field], 0);

  return (
    <div className={`p-4 ${cardBase}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-neutral-500">{total} dalam 30 hari</span>
      </div>
      <p className="mt-1 text-xs text-neutral-400">{hint}</p>
      <div
        role="img"
        aria-label={`${title}: ${total} dalam 30 hari terakhir`}
        className="mt-3 flex h-28 items-end gap-0.5"
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
      <div className="mt-1 flex justify-between text-2xs text-neutral-400">
        <span>{data[0] ? formatDay(data[0].date) : ''}</span>
        <span>{data.at(-1) ? formatDay(data.at(-1)!.date) : ''}</span>
      </div>
    </div>
  );
}

export default function MemberAfiliasiAnalisisPage() {
  const { productId } = useParams<{ productId: string }>();
  const [data, setData] = useState<ProductAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await fetch(`/api/affiliate/stats/products/${productId}`);
      if (!active) return;
      if (response.ok) {
        setData(await response.json());
      } else {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? 'Gagal memuat analisis produk');
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [productId]);

  if (loading) return <p className="text-sm text-neutral-500">Memuat analisis...</p>;

  if (!data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-red">{error}</p>
        <Link href="/member/afiliasi" className={btnOutline}>
          Kembali
        </Link>
      </div>
    );
  }

  const { product, totals, daily, recentOrders } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" className="h-20 w-16 shrink-0 object-cover" />
          ) : (
            <div className="h-20 w-16 shrink-0 bg-neutral-100" />
          )}
          <div>
            <p className="text-xs text-neutral-500">Analisis produk</p>
            <h1 className="text-xl font-bold text-foreground">{product.title}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Harga {formatCurrency(product.finalPrice)}
              {product.commission
                ? ` · Komisi ${formatAmount(product.commission.type, product.commission.value)}`
                : ''}
              {product.buyerDiscount
                ? ` · Diskon pembeli ${formatAmount(product.buyerDiscount.type, product.buyerDiscount.value)}`
                : ''}
            </p>
            {product.rateStatus && product.rateStatus !== 'ACTIVE' ? (
              <p className="mt-1 text-xs text-amber-700">
                Program afiliasi produk ini sedang tidak berjalan, jadi order baru belum
                menghasilkan komisi.
              </p>
            ) : null}
          </div>
        </div>
        <Link href="/member/afiliasi" className={btnOutline}>
          Kembali
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Klik Link Produk"
          value={totals.clicks.toString()}
          hint="Berapa kali link produk ini dibuka orang."
        />
        <Stat
          label="Unit Terjual"
          value={totals.unitsSold.toString()}
          hint="Jumlah eksemplar dari order yang sudah selesai."
        />
        <Stat
          label="Harga Produk Terjual"
          value={formatCurrency(totals.salesValue)}
          hint="Nilai penjualan produk ini dari order yang sudah selesai."
        />
        <Stat
          label="Komisi Masuk"
          value={formatCurrency(totals.commissionEarned)}
          hint="Komisi produk ini dari order selesai, menunggu dibayarkan admin."
        />
        <Stat
          label="Komisi Dibayar"
          value={formatCurrency(totals.commissionPaid)}
          hint="Komisi produk ini yang sudah ditransfer ke rekening Anda."
        />
        <Stat
          label="Komisi Menunggu Order Selesai"
          value={formatCurrency(totals.commissionPending)}
          hint="Order sudah dibayar tapi belum selesai. Belum pasti, bisa batal."
        />
      </div>

      <div className={`p-4 ${cardBase}`}>
        <h2 className="text-sm font-semibold text-foreground">Perjalanan Order</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Semua order lewat link Anda yang berisi produk ini, menurut status terakhirnya.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ['Total order', totals.orders.total],
            ['Menunggu bayar', totals.orders.awaitingPayment],
            ['Diproses', totals.orders.processing],
            ['Selesai', totals.orders.completed],
            ['Dibatalkan', totals.orders.cancelled],
          ].map(([label, count]) => (
            <div key={label} className="rounded-lg border border-neutral-200 px-3 py-2">
              <p className="text-xs text-neutral-500">{label}</p>
              <p className="text-lg font-bold text-foreground">{count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyBars
          title="Klik per Hari"
          hint="Seberapa ramai link produk ini dibuka."
          data={daily}
          field="clicks"
        />
        <DailyBars
          title="Order per Hari"
          hint="Order yang masuk lewat link Anda (semua status)."
          data={daily}
          field="orders"
        />
      </div>

      <div className={`p-4 ${cardBase}`}>
        <h2 className="text-sm font-semibold text-foreground">Order Terbaru</h2>
        <p className="mb-3 mt-1 text-xs text-neutral-400">
          20 order terakhir berisi produk ini. Komisi hanya muncul setelah order dibayar.
        </p>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Belum ada order lewat link Anda untuk produk ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 pr-4">No. Order</th>
                  <th className="py-2 pr-4">Tanggal</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Nilai</th>
                  <th className="py-2 pr-4">Komisi</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.orderNumber} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 font-mono text-xs text-foreground">
                      {order.orderNumber}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600">
                      {new Date(order.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600">{order.quantity}</td>
                    <td className="py-2 pr-4 text-neutral-600">
                      {formatCurrency(order.lineTotal)}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600">
                      {order.commission > 0 ? formatCurrency(order.commission) : '-'}
                    </td>
                    <td className="py-2">
                      <span
                        className={`${badgeBase} ${getOrderStatusBadgeClass(order.orderStatus)}`}
                      >
                        {getOrderStatusLabel(order.orderStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
