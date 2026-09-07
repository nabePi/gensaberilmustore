'use client';

import { useEffect, useState } from 'react';

import {
  OrderDetailModal,
  formatOrderDate,
  type OrderStatusValue,
} from '@/components/admin/OrderDetailModal';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '@/components/admin/ui/Table';
import {
  adminBadgeBase,
  adminBtnOutline,
  adminBtnPrimarySm,
  adminInputBase,
} from '@/lib/admin/styles';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_BADGE_CLASSES, ORDER_STATUS_LABELS } from '@/lib/order-status';

type FulfillmentOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatusValue;
  total: number;
  createdAt: string;
  receiverName: string;
  receiverPhone: string;
  source: 'ONLINE' | 'POS';
};

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'Status Aktif (Lunas & Setelahnya)', value: 'PAID,PACKED,SHIPPED' },
  { label: 'Lunas - Perlu Dikemas', value: 'PAID' },
  { label: 'Dikemas - Siap Dikirim', value: 'PACKED' },
  { label: 'Dikirim', value: 'SHIPPED' },
  { label: 'Semua Status', value: '' },
  { label: 'Menunggu Pembayaran', value: 'AWAITING_PAYMENT' },
  { label: 'Selesai', value: 'COMPLETED' },
  { label: 'Dibatalkan', value: 'CANCELLED' },
];

export default function AdminFulfillmentPage() {
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_OPTIONS[0]?.value ?? '');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'ONLINE' | 'POS'>('ALL');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function loadOrders() {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (search.trim()) params.set('q', search.trim());
    if (sourceFilter !== 'ALL') params.set('source', sourceFilter);
    for (const status of statusFilter ? statusFilter.split(',') : []) {
      params.append('status', status);
    }

    const response = await fetch(`/api/admin/orders?${params.toString()}`);
    if (response.ok) {
      const data: { items: FulfillmentOrder[] } = await response.json();
      setOrders(data.items);
    }
    setLoading(false);
    setSelected(new Set());
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('q', search.trim());
      if (sourceFilter !== 'ALL') params.set('source', sourceFilter);
      for (const status of statusFilter ? statusFilter.split(',') : []) {
        params.append('status', status);
      }

      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      if (response.ok) {
        const data: { items: FulfillmentOrder[] } = await response.json();
        setOrders(data.items);
      }
      setLoading(false);
      setSelected(new Set());
    }

    load();
  }, [search, statusFilter, sourceFilter]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === orders.length ? new Set() : new Set(orders.map((o) => o.id)),
    );
  }

  async function handleBulkStatus(toStatus: 'PACKED' | 'SHIPPED') {
    if (selected.size === 0) return;
    setError(null);
    setProcessing(true);

    const response = await fetch('/api/admin/orders/bulk-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: Array.from(selected), toStatus }),
    });
    const data = await response.json();
    setProcessing(false);

    if (!response.ok) {
      setError(data.error ?? 'Gagal memproses pesanan');
      return;
    }

    if (data.failed?.length > 0) {
      setError(`${data.failed.length} pesanan gagal diproses (transisi status tidak valid)`);
    }

    await loadOrders();
  }

  function handlePrint() {
    if (selected.size === 0) return;
    const ids = Array.from(selected).join(',');
    window.open(`/admin/fulfillment/print?ids=${ids}`, '_blank');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pusat Fulfillment"
        description="Proses banyak pesanan sekaligus dengan cepat"
        action={<span className="text-sm text-neutral-500">{orders.length} pesanan</span>}
      />

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Cari ID, nama, atau telepon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${adminInputBase} sm:w-64`}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={adminInputBase}
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as 'ALL' | 'ONLINE' | 'POS')}
          className={adminInputBase}
        >
          <option value="ALL">Semua Sumber</option>
          <option value="ONLINE">Online</option>
          <option value="POS">POS</option>
        </select>
      </div>

      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={orders.length > 0 && selected.size === orders.length}
            onChange={toggleSelectAll}
            className="h-4 w-4"
          />
          <label className="text-sm text-neutral-600">
            <strong>{selected.size}</strong> pesanan dipilih
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={selected.size === 0 || processing}
            onClick={() => handleBulkStatus('PACKED')}
            className={adminBtnOutline}
          >
            Tandai Dikemas
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || processing}
            onClick={() => handleBulkStatus('SHIPPED')}
            className={adminBtnOutline}
          >
            Tandai Dikirim
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={handlePrint}
            className={adminBtnPrimarySm}
          >
            Cetak Packing List
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat pesanan...</p>
      ) : orders.length === 0 ? (
        <TableEmptyState>Tidak ada pesanan ditemukan.</TableEmptyState>
      ) : (
        <Table>
          <Thead>
            <Th />
            <Th>No. Pesanan</Th>
            <Th>Penerima</Th>
            <Th>Tanggal</Th>
            <Th>Sumber</Th>
            <Th>Status</Th>
            <Th className="text-right">Total</Th>
          </Thead>
          <Tbody>
            {orders.map((order) => (
              <Tr key={order.id}>
                <Td>
                  <input
                    type="checkbox"
                    checked={selected.has(order.id)}
                    onChange={() => toggleSelected(order.id)}
                    className="h-4 w-4"
                  />
                </Td>
                <Td
                  className="cursor-pointer font-medium text-foreground"
                  onClick={() => setOpenOrderId(order.id)}
                >
                  {order.orderNumber}
                </Td>
                <Td className="text-neutral-600">
                  {order.receiverName}
                  <br />
                  <span className="text-xs text-neutral-400">{order.receiverPhone}</span>
                </Td>
                <Td className="text-neutral-600">{formatOrderDate(order.createdAt)}</Td>
                <Td className="text-neutral-600">{order.source === 'ONLINE' ? 'Online' : 'POS'}</Td>
                <Td>
                  <span className={`${adminBadgeBase} ${ORDER_STATUS_BADGE_CLASSES[order.status]}`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </Td>
                <Td className="text-right font-medium text-foreground">
                  {formatCurrency(order.total)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {openOrderId ? (
        <OrderDetailModal
          orderId={openOrderId}
          onClose={() => setOpenOrderId(null)}
          onStatusChanged={loadOrders}
        />
      ) : null}
    </div>
  );
}
