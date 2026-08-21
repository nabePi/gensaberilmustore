'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_BADGE_CLASSES, ORDER_STATUS_LABELS } from '@/lib/order-status';
import { badgeBase, btnOutline, btnSolid, cardBase } from '@/lib/styles';

type OrderStatusValue = keyof typeof ORDER_STATUS_LABELS;

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatusValue;
  createdAt: string;
  trackingNumber: string | null;
  receiver: {
    name: string;
    phone: string;
    address: string;
    city: string;
    note: string | null;
  };
  pricing: {
    subtotal: number;
    shippingCost: number;
    discount: number;
    total: number;
  };
  payment: { method: string };
  items: {
    id: string;
    title: string;
    imageUrl: string | null;
    priceSnapshot: number;
    quantity: number;
    lineTotal: number;
  }[];
  history: {
    id: string;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }[];
};

export default function MemberTransaksiDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      const response = await fetch(`/api/orders/${params.id}`);
      if (!active) return;
      if (!response.ok) {
        setIsNotFound(true);
        setLoading(false);
        return;
      }
      const data: OrderDetail = await response.json();
      setOrder(data);
      setLoading(false);
    }

    loadOrder();
    return () => {
      active = false;
    };
  }, [params.id]);

  async function handleCancel() {
    if (!confirm('Batalkan pesanan ini?')) return;

    setCancelling(true);
    setCancelError(null);

    try {
      const response = await fetch(`/api/orders/${params.id}/cancel`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        setCancelError(data.error ?? 'Gagal membatalkan pesanan');
        return;
      }

      setOrder(data);
    } catch {
      setCancelError('Gagal membatalkan pesanan');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Memuat pesanan...</p>;
  }

  if (isNotFound || !order) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white py-16 text-center">
        <p className="text-sm text-neutral-500">Pesanan tidak ditemukan.</p>
        <Link href="/member/transaksi" className={btnSolid}>
          Kembali ke Riwayat Transaksi
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">{order.orderNumber}</h1>
            <span className={`${badgeBase} ${ORDER_STATUS_BADGE_CLASSES[order.status]}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {new Date(order.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        {order.status === 'AWAITING_PAYMENT' ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className={btnOutline}
            >
              {cancelling ? 'Membatalkan...' : 'Batalkan Pesanan'}
            </button>
            <Link href={`/payment/success?orderId=${order.id}`} className={btnSolid}>
              Bayar Sekarang
            </Link>
          </div>
        ) : null}
      </div>

      {cancelError ? <p className="text-sm text-red">{cancelError}</p> : null}

      <div className={`p-4 ${cardBase}`}>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Item Pesanan</h2>
        <div className="flex flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.title} className="h-16 w-12 object-cover" />
              ) : (
                <div className="h-16 w-12 bg-neutral-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-neutral-500">
                  {item.quantity} x {formatCurrency(item.priceSnapshot)}
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(item.lineTotal)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`p-4 ${cardBase}`}>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Ringkasan Pembayaran</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span>{formatCurrency(order.pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Ongkos Kirim</span>
              <span>{formatCurrency(order.pricing.shippingCost)}</span>
            </div>
            {order.pricing.discount > 0 ? (
              <div className="flex justify-between text-green">
                <span>Diskon</span>
                <span>-{formatCurrency(order.pricing.discount)}</span>
              </div>
            ) : null}
            <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 text-sm font-bold text-foreground">
              <span>Total</span>
              <span>{formatCurrency(order.pricing.total)}</span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">Metode: {order.payment.method}</p>
          </div>
        </div>

        <div className={`p-4 ${cardBase}`}>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Alamat Penerima</h2>
          <div className="text-sm text-neutral-600">
            <p className="font-medium text-foreground">{order.receiver.name}</p>
            <p>{order.receiver.phone}</p>
            <p className="mt-1">
              {order.receiver.address}, {order.receiver.city}
            </p>
            {order.receiver.note ? (
              <p className="mt-1 italic text-neutral-400">Catatan: {order.receiver.note}</p>
            ) : null}
            {order.trackingNumber ? (
              <p className="mt-1">
                No. Resi:{' '}
                <span className="font-medium text-foreground">{order.trackingNumber}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`p-4 ${cardBase}`}>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Riwayat Status</h2>
        <div className="flex flex-col gap-3">
          {order.history.map((entry) => (
            <div key={entry.id} className="flex gap-3 text-sm">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
              <div>
                <p className="font-medium text-foreground">
                  {ORDER_STATUS_LABELS[entry.toStatus as OrderStatusValue] ?? entry.toStatus}
                </p>
                <p className="text-xs text-neutral-500">
                  {new Date(entry.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {entry.note ? <p className="text-xs text-neutral-400">{entry.note}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
