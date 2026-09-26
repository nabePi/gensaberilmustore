'use client';

import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import { adminBadgeBase, adminBtnOutlineSm, adminBtnPrimarySm } from '@/lib/admin/styles';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_BADGE_CLASSES, ORDER_STATUS_LABELS } from '@/lib/order-status';

export type OrderStatusValue = keyof typeof ORDER_STATUS_LABELS;

export type OrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatusValue;
  source: 'ONLINE' | 'POS';
  createdAt: string;
  airwaybillNumber: string | null;
  shippingMethod: 'JNE' | 'SELF_PICKUP' | 'OTHER';
  shippingService: string;
  receiver: {
    name: string;
    phone: string;
    email: string | null;
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
    voucherDiscount: number;
    manualDiscount: number;
    discount: number;
    total: number;
  };
  payment: {
    method: string;
    manualPaymentCode: number | null;
    paymentClaimedAt: string | null;
    proofUrl: string | null;
  };
  voucher: { code: string; discount: number } | null;
  affiliate: { code: string; user: { id: string; name: string | null } | null } | null;
  member: { id: string; name: string | null; email: string } | null;
  items: {
    id: string;
    productId: string | null;
    title: string;
    slug: string | null;
    imageUrl: string | null;
    priceSnapshot: number;
    discountPercentSnapshot: number;
    quantity: number;
    lineTotal: number;
  }[];
  history: {
    id: string;
    fromStatus: OrderStatusValue | null;
    toStatus: OrderStatusValue;
    note: string | null;
    createdAt: string;
    changedByUser: { id: string; name: string | null } | null;
  }[];
};

export const NEXT_STATUS_OPTIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  AWAITING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function formatOrderDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

export function formatOrderDateTime(value: string) {
  const date = new Date(value);
  const time = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
  return `${formatOrderDate(value)} ${time} WIB`;
}

export function OrderDetailModal({
  orderId,
  onClose,
  onStatusChanged,
}: {
  orderId: string;
  onClose: () => void;
  onStatusChanged?: (order: OrderDetail) => void;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingAirwaybill, setGeneratingAirwaybill] = useState(false);
  const [airwaybillError, setAirwaybillError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      const response = await fetch(`/api/admin/orders/${orderId}`);
      if (response.ok) {
        setOrder(await response.json());
      }
      setLoading(false);
    }

    loadOrder();
  }, [orderId]);

  async function handleStatusChange(toStatus: OrderStatusValue) {
    setError(null);
    setUpdating(true);
    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toStatus }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? 'Gagal mengubah status');
      setUpdating(false);
      return;
    }
    setOrder(data);
    setUpdating(false);
    onStatusChanged?.(data);
  }

  async function handleGenerateAirwaybill() {
    setAirwaybillError(null);
    setGeneratingAirwaybill(true);
    const response = await fetch(`/api/admin/orders/${orderId}/airwaybill`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) {
      setAirwaybillError(data.error ?? 'Gagal membuat resi');
      setGeneratingAirwaybill(false);
      return;
    }
    setOrder(data);
    setGeneratingAirwaybill(false);
    onStatusChanged?.(data);
  }

  return (
    <AdminModal title="Detail Pesanan" onClose={onClose} widthClassName="max-w-2xl">
      {loading || !order ? (
        <p className="text-sm text-neutral-500">Memuat detail pesanan...</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-base font-bold text-foreground">{order.orderNumber}</p>
              <p className="text-xs text-neutral-500">
                {formatOrderDate(order.createdAt)} · {order.source === 'ONLINE' ? 'Online' : 'POS'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`${adminBadgeBase} ${ORDER_STATUS_BADGE_CLASSES[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              <span className={`${adminBadgeBase} bg-neutral-100 text-neutral-600`}>
                {order.shippingMethod === 'SELF_PICKUP'
                  ? 'Ambil Sendiri'
                  : order.shippingMethod === 'OTHER'
                    ? order.shippingService
                    : 'JNE'}
              </span>
              {order.shippingMethod === 'JNE' ? (
                <button
                  type="button"
                  disabled={!order.airwaybillNumber}
                  title={
                    order.airwaybillNumber ? undefined : 'Nomor resi (airwaybill) belum tersedia'
                  }
                  onClick={() => window.open(`/admin/fulfillment/print?ids=${order.id}`, '_blank')}
                  className={adminBtnOutlineSm}
                >
                  Cetak Resi
                </button>
              ) : null}
              {order.shippingMethod === 'JNE' && order.status !== 'AWAITING_PAYMENT' ? (
                <button
                  type="button"
                  disabled={!!order.airwaybillNumber || generatingAirwaybill}
                  title={
                    order.airwaybillNumber ? 'Nomor resi (airwaybill) sudah dibuat' : undefined
                  }
                  onClick={handleGenerateAirwaybill}
                  className={adminBtnOutlineSm}
                >
                  {generatingAirwaybill ? 'Membuat Resi...' : 'Generate Resi'}
                </button>
              ) : null}
              {order.shippingMethod === 'SELF_PICKUP' ? (
                <button
                  type="button"
                  onClick={() => window.open(`/admin/fulfillment/print?ids=${order.id}`, '_blank')}
                  className={adminBtnOutlineSm}
                >
                  Cetak Label
                </button>
              ) : null}
            </div>
          </div>
          {airwaybillError ? <p className="text-sm text-red">{airwaybillError}</p> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">Penerima</h3>
              <p className="text-sm text-neutral-600">{order.receiver.name}</p>
              <p className="text-sm text-neutral-600">
                <span className="font-semibold text-neutral-700">No. Telepon:</span>{' '}
                {order.receiver.phone}
              </p>
              <p className="text-sm text-neutral-600">
                <span className="font-semibold text-neutral-700">Alamat:</span>{' '}
                {order.receiver.address}
              </p>
              {order.receiver.province ? (
                <p className="text-sm text-neutral-600">
                  <span className="font-semibold text-neutral-700">Provinsi:</span>{' '}
                  {order.receiver.province}
                </p>
              ) : null}
              {order.receiver.city ? (
                <p className="text-sm text-neutral-600">
                  <span className="font-semibold text-neutral-700">Kota/Kabupaten:</span>{' '}
                  {order.receiver.city}
                </p>
              ) : null}
              {order.receiver.district ? (
                <p className="text-sm text-neutral-600">
                  <span className="font-semibold text-neutral-700">Kecamatan:</span>{' '}
                  {order.receiver.district}
                </p>
              ) : null}
              {order.receiver.subdistrict ? (
                <p className="text-sm text-neutral-600">
                  <span className="font-semibold text-neutral-700">Kelurahan:</span>{' '}
                  {order.receiver.subdistrict}
                </p>
              ) : null}
              {order.receiver.zipCode ? (
                <p className="text-sm text-neutral-600">
                  <span className="font-semibold text-neutral-700">Kode Pos:</span>{' '}
                  {order.receiver.zipCode}
                </p>
              ) : null}
              {order.airwaybillNumber ? (
                <p className="text-sm text-neutral-600">
                  <span className="font-semibold text-neutral-700">No. Airwaybill (JNE):</span>{' '}
                  {order.airwaybillNumber}
                </p>
              ) : null}
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">Pembayaran</h3>
              <p className="text-sm text-neutral-600">Metode: {order.payment.method}</p>
              {order.payment.manualPaymentCode !== null ? (
                <p className="text-sm text-neutral-600">
                  Kode Unik:{' '}
                  <span className="font-medium text-foreground">
                    {order.payment.manualPaymentCode.toString().padStart(3, '0')}
                  </span>
                </p>
              ) : null}
              {order.status === 'AWAITING_PAYMENT' && order.payment.paymentClaimedAt ? (
                <p className="text-sm font-medium text-amber-600">
                  Pembeli mengklaim sudah transfer pada{' '}
                  {formatOrderDate(order.payment.paymentClaimedAt)}
                </p>
              ) : null}
              {order.payment.proofUrl ? (
                <div className="mt-2">
                  <p className="mb-1 text-sm font-semibold text-neutral-700">Bukti Pembayaran</p>
                  <a href={order.payment.proofUrl} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.payment.proofUrl}
                      alt="Bukti pembayaran"
                      className="h-32 w-full max-w-[200px] rounded-md border border-neutral-200 object-cover hover:opacity-90"
                    />
                  </a>
                </div>
              ) : null}
              {order.member ? (
                <p className="text-sm text-neutral-600">
                  Member: {order.member.name ?? order.member.email}
                </p>
              ) : (
                <p className="text-sm text-neutral-600">Tamu (tanpa akun)</p>
              )}
              {order.affiliate ? (
                <p className="text-sm text-neutral-600">
                  Afiliasi: {order.affiliate.code}
                  {order.affiliate.user ? ` (${order.affiliate.user.name})` : ''}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Item Pesanan</h3>
            <div className="flex flex-col gap-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="h-10 w-8 object-cover" />
                    ) : (
                      <div className="h-10 w-8 bg-neutral-100" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-neutral-500">
                        {item.quantity} x {formatCurrency(item.priceSnapshot)}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-foreground">
                    {formatCurrency(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-neutral-200 pt-3 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span>{formatCurrency(order.pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Ongkos Kirim</span>
              <span>{formatCurrency(order.pricing.shippingCost)}</span>
            </div>
            {order.pricing.discount > 0 ? (
              <div className="flex justify-between text-neutral-600">
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
            <div className="flex justify-between text-base font-bold text-foreground">
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
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Riwayat Status</h3>
            <div className="flex flex-col gap-1.5">
              {order.history.map((entry) => (
                <div key={entry.id} className="text-xs text-neutral-500">
                  <span className="font-medium text-foreground">
                    {ORDER_STATUS_LABELS[entry.toStatus]}
                  </span>{' '}
                  · {formatOrderDateTime(entry.createdAt)}
                  {entry.changedByUser ? ` · oleh ${entry.changedByUser.name}` : ''}
                  {entry.note ? ` · ${entry.note}` : ''}
                </div>
              ))}
            </div>
          </div>

          {NEXT_STATUS_OPTIONS[order.status].length > 0 ? (
            <div className="border-t border-neutral-200 pt-3">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Ubah Status</h3>
              {error ? <p className="mb-2 text-sm text-red">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                {NEXT_STATUS_OPTIONS[order.status].map((next) => (
                  <button
                    key={next}
                    type="button"
                    disabled={updating}
                    onClick={() => handleStatusChange(next)}
                    className={adminBtnPrimarySm}
                  >
                    Tandai {ORDER_STATUS_LABELS[next]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AdminModal>
  );
}
