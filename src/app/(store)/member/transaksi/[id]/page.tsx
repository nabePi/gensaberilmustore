'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { formatCurrency } from '@/lib/format';
import {
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  ORDER_STATUS_LABELS,
} from '@/lib/order-status';
import { badgeBase, btnOutline, btnSolid, cardBase } from '@/lib/styles';

type OrderStatusValue = keyof typeof ORDER_STATUS_LABELS;

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatusValue;
  createdAt: string;
  airwaybillNumber: string | null;
  shippingMethod: 'JNE' | 'SELF_PICKUP';
  receiver: {
    name: string;
    phone: string;
    address: string;
    province: string | null;
    city: string | null;
    district: string | null;
    subdistrict: string | null;
    zipCode: string | null;
    note: string | null;
  };
  pricing: {
    subtotal: number;
    shippingCost: number;
    discount: number;
    total: number;
  };
  payment: { method: string; manualPaymentCode: number | null; paymentClaimedAt: string | null };
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

type JneTrackingHistoryEntry = { date: string; desc: string; code: string };

type JneTracking = {
  lastStatus: string;
  podStatus: string;
  cityName: string | null;
  estimateDelivery: string | null;
  history: JneTrackingHistoryEntry[];
};

export default function MemberTransaksiDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<JneTracking | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!order?.airwaybillNumber) return;

    let active = true;

    async function loadTracking() {
      setTrackingLoading(true);
      setTrackingError(null);
      const response = await fetch(`/api/orders/${params.id}/tracking`);
      if (!active) return;
      const data = await response.json();
      if (!response.ok) {
        setTrackingError(data.error ?? 'Gagal memuat informasi tracking');
        setTrackingLoading(false);
        return;
      }
      setTracking(data);
      setTrackingLoading(false);
    }

    loadTracking();
    return () => {
      active = false;
    };
  }, [params.id, order?.airwaybillNumber]);

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

  const historyEntries = [
    ...order.history.map((entry) => ({
      id: entry.id,
      label: ORDER_STATUS_LABELS[entry.toStatus as OrderStatusValue] ?? entry.toStatus,
      note: entry.note,
      createdAt: entry.createdAt,
    })),
    ...(order.status === 'AWAITING_PAYMENT' && order.payment.paymentClaimedAt
      ? [
          {
            id: 'payment-claimed',
            label: 'Pembayaran Sedang Dicek Admin',
            note: 'Anda telah mengklaim sudah melakukan pembayaran, mohon tunggu konfirmasi admin.',
            createdAt: order.payment.paymentClaimedAt,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">{order.orderNumber}</h1>
            <span
              className={`${badgeBase} ${getOrderStatusBadgeClass(order.status, order.payment.paymentClaimedAt)}`}
            >
              {getOrderStatusLabel(order.status, order.payment.paymentClaimedAt)}
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
              <span>Metode Pengiriman</span>
              <span>{order.shippingMethod === 'SELF_PICKUP' ? 'Ambil Sendiri' : 'JNE'}</span>
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
            {order.payment.manualPaymentCode !== null ? (
              <div className="flex justify-between text-neutral-600">
                <span>Kode Unik</span>
                <span>+{order.payment.manualPaymentCode.toString().padStart(3, '0')}</span>
              </div>
            ) : null}
            <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 text-sm font-bold text-foreground">
              <span>
                {order.payment.manualPaymentCode !== null ? 'Total + Kode Unik' : 'Total'}
              </span>
              <span>
                {formatCurrency(
                  order.payment.manualPaymentCode !== null
                    ? order.pricing.total + order.payment.manualPaymentCode
                    : order.pricing.total,
                )}
              </span>
            </div>
            {order.payment.manualPaymentCode !== null ? (
              <p className="text-xs text-neutral-400">
                ({formatCurrency(order.pricing.total)} + kode unik{' '}
                {order.payment.manualPaymentCode.toString().padStart(3, '0')})
              </p>
            ) : null}
            <p className="mt-1 text-xs text-neutral-400">Metode: {order.payment.method}</p>
          </div>
        </div>

        <div className={`p-4 ${cardBase}`}>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Alamat Penerima</h2>
          <div className="text-sm text-neutral-600">
            <p className="font-medium text-foreground">{order.receiver.name}</p>
            <p>
              <span className="font-semibold text-neutral-700">No. Telepon:</span>{' '}
              {order.receiver.phone}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-neutral-700">Alamat:</span>{' '}
              {order.receiver.address}
            </p>
            {order.receiver.province ? (
              <p>
                <span className="font-semibold text-neutral-700">Provinsi:</span>{' '}
                {order.receiver.province}
              </p>
            ) : null}
            {order.receiver.city ? (
              <p>
                <span className="font-semibold text-neutral-700">Kota/Kabupaten:</span>{' '}
                {order.receiver.city}
              </p>
            ) : null}
            {order.receiver.district ? (
              <p>
                <span className="font-semibold text-neutral-700">Kecamatan:</span>{' '}
                {order.receiver.district}
              </p>
            ) : null}
            {order.receiver.subdistrict ? (
              <p>
                <span className="font-semibold text-neutral-700">Kelurahan:</span>{' '}
                {order.receiver.subdistrict}
              </p>
            ) : null}
            {order.receiver.zipCode ? (
              <p>
                <span className="font-semibold text-neutral-700">Kode Pos:</span>{' '}
                {order.receiver.zipCode}
              </p>
            ) : null}
            {order.receiver.note ? (
              <p className="mt-1 italic text-neutral-400">Catatan: {order.receiver.note}</p>
            ) : null}
            {order.airwaybillNumber ? (
              <p className="mt-1">
                No. Resi:{' '}
                <span className="font-medium text-foreground">{order.airwaybillNumber}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {order.airwaybillNumber ? (
        <div className={`p-4 ${cardBase}`}>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Lacak Pengiriman</h2>
          <p className="mb-3 text-xs text-neutral-400">
            No. Airwaybill:{' '}
            <span className="font-medium text-neutral-600">{order.airwaybillNumber}</span>
          </p>
          {trackingLoading ? (
            <p className="text-sm text-neutral-500">Memuat informasi tracking...</p>
          ) : trackingError ? (
            <p className="text-sm text-neutral-500">{trackingError}</p>
          ) : tracking ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-md bg-neutral-50 p-3 text-sm">
                <p className="font-medium text-foreground">{tracking.lastStatus}</p>
                {tracking.estimateDelivery ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    Estimasi pengiriman: {tracking.estimateDelivery}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-3">
                {[...tracking.history].reverse().map((entry, index) => (
                  <div key={`${entry.code}-${entry.date}-${index}`} className="flex gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                    <div>
                      <p className="font-medium text-foreground">{entry.desc}</p>
                      <p className="text-xs text-neutral-500">{entry.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={`p-4 ${cardBase}`}>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Riwayat Status</h2>
        <div className="flex flex-col gap-3">
          {historyEntries.map((entry) => (
            <div key={entry.id} className="flex gap-3 text-sm">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
              <div>
                <p className="font-medium text-foreground">{entry.label}</p>
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
