'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { formatCurrency } from '@/lib/format';
import {
  ORDER_STATUS_BADGE_CLASSES,
  ORDER_STATUS_FILTER_TABS,
  ORDER_STATUS_LABELS,
} from '@/lib/order-status';
import { badgeBase, btnSolid, cardBase } from '@/lib/styles';

type OrderStatusValue = keyof typeof ORDER_STATUS_LABELS;

type OrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatusValue;
  total: number;
  itemCount: number;
  thumbnailUrl: string | null;
  createdAt: string;
};

export default function MemberTransaksiPage() {
  const [status, setStatus] = useState<'ALL' | OrderStatusValue>('ALL');
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      const params = new URLSearchParams({ limit: '60' });
      if (status !== 'ALL') params.set('status', status);

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) {
        if (active) setLoading(false);
        return;
      }
      const data: { items: OrderListItem[]; total: number } = await response.json();
      if (active) {
        setItems(data.items);
        setTotal(data.total);
        setLoading(false);
      }
    }

    loadOrders();
    return () => {
      active = false;
    };
  }, [status]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Riwayat Transaksi</h1>
        <p className="mt-1 text-sm text-neutral-500">{total} transaksi ditemukan</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {ORDER_STATUS_FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              status === tab.value
                ? 'bg-brand text-white'
                : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat transaksi...</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-500">Belum ada transaksi pada status ini.</p>
          <Link href="/products" className={btnSolid}>
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((order) => (
            <div
              key={order.id}
              className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${cardBase}`}
            >
              <div className="flex items-center gap-3">
                {order.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={order.thumbnailUrl} alt="" className="h-14 w-11 object-cover" />
                ) : (
                  <div className="h-14 w-11 bg-neutral-100" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{order.orderNumber}</p>
                  <p className="text-xs text-neutral-500">
                    {new Date(order.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    · {order.itemCount} item
                  </p>
                  <span
                    className={`mt-1 inline-block ${badgeBase} ${ORDER_STATUS_BADGE_CLASSES[order.status]}`}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(order.total)}
                </span>
                <Link
                  href={`/member/transaksi/${order.id}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Lihat Detail
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
