'use client';

import { useRouter, useSearchParams } from 'next/navigation';
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
  adminBtnPrimary,
  adminInputBase,
} from '@/lib/admin/styles';
import { formatCurrency } from '@/lib/format';
import {
  ORDER_STATUS_BADGE_CLASSES,
  ORDER_STATUS_FILTER_TABS,
  ORDER_STATUS_LABELS,
} from '@/lib/order-status';

type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatusValue;
  total: number;
  manualPaymentCode: number | null;
  itemCount: number;
  thumbnailUrl: string | null;
  createdAt: string;
  receiverName: string;
  receiverPhone: string;
  source: 'ONLINE' | 'POS';
  affiliateCode: string | null;
};

export default function AdminPesananPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openOrderId = searchParams.get('openOrder');

  const [status, setStatus] = useState<'ALL' | OrderStatusValue>('ALL');
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status !== 'ALL') params.set('status', status);
      if (q.trim()) params.set('q', q.trim());
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!response.ok) {
        if (active) setLoading(false);
        return;
      }
      const data: { items: AdminOrderListItem[]; total: number } = await response.json();
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
  }, [status, q, dateFrom, dateTo, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function buildExportUrl() {
    const params = new URLSearchParams();
    if (status !== 'ALL') params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return `/api/admin/orders/export?${params.toString()}`;
  }

  function openOrder(id: string) {
    router.push(`/admin/pesanan?openOrder=${id}`);
  }

  function closeOrder() {
    router.push('/admin/pesanan');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kelola Pesanan"
        description={`${total} pesanan ditemukan`}
        action={
          <a href={buildExportUrl()} className={adminBtnOutline}>
            Export CSV
          </a>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {ORDER_STATUS_FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              status === tab.value
                ? 'bg-brand text-white'
                : 'border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          type="search"
          placeholder="Cari no. pesanan / penerima / telepon"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className={adminInputBase}
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className={adminInputBase}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className={adminInputBase}
        />
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat pesanan...</p>
      ) : items.length === 0 ? (
        <TableEmptyState>Tidak ada pesanan ditemukan.</TableEmptyState>
      ) : (
        <Table>
          <Thead>
            <Th>No. Pesanan</Th>
            <Th>Penerima</Th>
            <Th>Tanggal</Th>
            <Th>Sumber</Th>
            <Th>Status</Th>
            <Th className="text-right">Total</Th>
          </Thead>
          <Tbody>
            {items.map((order) => (
              <Tr key={order.id} onClick={() => openOrder(order.id)}>
                <Td className="font-medium text-foreground">{order.orderNumber}</Td>
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
                  {formatCurrency(
                    order.manualPaymentCode !== null
                      ? order.total + order.manualPaymentCode
                      : order.total,
                  )}
                  {order.manualPaymentCode !== null ? (
                    <span className="block text-xs font-normal text-neutral-400">
                      (+kode unik {order.manualPaymentCode.toString().padStart(3, '0')})
                    </span>
                  ) : null}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className={adminBtnOutline}
          >
            Sebelumnya
          </button>
          <span className="text-sm text-neutral-500">
            Halaman {page} dari {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className={adminBtnPrimary}
          >
            Selanjutnya
          </button>
        </div>
      ) : null}

      {openOrderId ? <OrderDetailModal orderId={openOrderId} onClose={closeOrder} /> : null}
    </div>
  );
}
