'use client';

import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_BADGE_CLASSES, ORDER_STATUS_LABELS } from '@/lib/order-status';
import { badgeBase, btnOutlineSm, btnSolidSm, inputBase } from '@/lib/styles';

export type OrderStatusValue = keyof typeof ORDER_STATUS_LABELS;

export type OrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatusValue;
  source: 'ONLINE' | 'POS';
  createdAt: string;
  trackingNumber: string | null;
  receiver: {
    name: string;
    phone: string;
    email: string | null;
    address: string;
    city: string | null;
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
  payment: { method: string };
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
  });
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
  const [resiInputOpen, setResiInputOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

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

  async function handleStatusChange(toStatus: OrderStatusValue, resi?: string) {
    setError(null);
    setUpdating(true);
    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toStatus,
        ...(resi?.trim() ? { trackingNumber: resi.trim() } : {}),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? 'Gagal mengubah status');
      setUpdating(false);
      return;
    }
    setOrder(data);
    setUpdating(false);
    setResiInputOpen(false);
    setTrackingNumber('');
    onStatusChanged?.(data);
  }

  function handleNextStatusClick(next: OrderStatusValue) {
    if (next === 'SHIPPED') {
      setError(null);
      setResiInputOpen(true);
      return;
    }
    handleStatusChange(next);
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
            <span className={`${badgeBase} ${ORDER_STATUS_BADGE_CLASSES[order.status]}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">Penerima</h3>
              <p className="text-sm text-neutral-600">{order.receiver.name}</p>
              <p className="text-sm text-neutral-600">{order.receiver.phone}</p>
              <p className="text-sm text-neutral-600">{order.receiver.address}</p>
              {order.receiver.city ? (
                <p className="text-sm text-neutral-600">{order.receiver.city}</p>
              ) : null}
              {order.trackingNumber ? (
                <p className="text-sm text-neutral-600">
                  No. Resi:{' '}
                  <span className="font-medium text-foreground">{order.trackingNumber}</span>
                </p>
              ) : null}
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">Pembayaran</h3>
              <p className="text-sm text-neutral-600">Metode: {order.payment.method}</p>
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
            <div className="flex justify-between text-base font-bold text-foreground">
              <span>Total</span>
              <span>{formatCurrency(order.pricing.total)}</span>
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
                  · {formatOrderDate(entry.createdAt)}
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
                    onClick={() => handleNextStatusClick(next)}
                    className={btnSolidSm}
                  >
                    Tandai {ORDER_STATUS_LABELS[next]}
                  </button>
                ))}
              </div>
              {resiInputOpen ? (
                <div className="mt-3 flex flex-col gap-2 rounded-sm border border-neutral-200 bg-neutral-50 p-3">
                  <label className="text-xs font-medium text-neutral-600">
                    Nomor Resi / Tracking Number (opsional)
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                    placeholder="Contoh: JNE123456789"
                    className={inputBase}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusChange('SHIPPED', trackingNumber)}
                      className={btnSolidSm}
                    >
                      {updating ? 'Memproses...' : 'Konfirmasi & Tandai Dikirim'}
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => {
                        setResiInputOpen(false);
                        setTrackingNumber('');
                      }}
                      className={btnOutlineSm}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </AdminModal>
  );
}
