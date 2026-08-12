'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useEffect, useMemo, useState } from 'react';

import {
  OrderDetailModal,
  formatOrderDate,
  type OrderStatusValue,
} from '@/components/admin/OrderDetailModal';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import { cardBase, inputBase } from '@/lib/styles';

type BoardOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatusValue;
  total: number;
  itemCount: number;
  createdAt: string;
  receiverName: string;
  receiverPhone: string;
  source: 'ONLINE' | 'POS';
};

const BOARD_COLUMNS: OrderStatusValue[] = [
  'AWAITING_PAYMENT',
  'PAID',
  'PACKED',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
];

const VALID_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  AWAITING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function OrderCard({ order }: { order: BoardOrder }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { status: order.status },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-md border border-neutral-200 bg-white p-3 text-sm shadow-sm active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <p className="font-semibold text-foreground">{order.orderNumber}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{order.receiverName}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
          {order.source === 'ONLINE' ? 'Online' : 'POS'}
        </span>
        <span className="font-semibold text-foreground">{formatCurrency(order.total)}</span>
      </div>
      <p className="mt-1 text-[11px] text-neutral-400">{formatOrderDate(order.createdAt)}</p>
    </div>
  );
}

function BoardColumn({
  status,
  orders,
  onCardClick,
}: {
  status: OrderStatusValue;
  orders: BoardOrder[];
  onCardClick: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col gap-3 rounded-lg border p-3 ${
        isOver ? 'border-brand bg-brand-50' : 'border-neutral-200 bg-neutral-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">{ORDER_STATUS_LABELS[status]}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-neutral-500">
          {orders.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {orders.map((order) => (
          <div key={order.id} onClick={() => onCardClick(order.id)}>
            <OrderCard order={order} />
          </div>
        ))}
        {orders.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">Tidak ada pesanan</p>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminBoardPage() {
  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<'ALL' | 'ONLINE' | 'POS'>('ALL');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      setError(null);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 14);
      const params = new URLSearchParams({
        limit: '100',
        dateFrom: dateFrom.toISOString(),
      });
      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      if (response.ok) {
        const data: { items: BoardOrder[] } = await response.json();
        setOrders(data.items);
      } else {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? 'Gagal memuat pesanan');
      }
      setLoading(false);
    }

    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (source !== 'ALL' && order.source !== source) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !order.orderNumber.toLowerCase().includes(q) &&
          !order.receiverName.toLowerCase().includes(q) &&
          !order.receiverPhone.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [orders, search, source]);

  const ordersByStatus = useMemo(() => {
    const map: Record<OrderStatusValue, BoardOrder[]> = {
      AWAITING_PAYMENT: [],
      PAID: [],
      PACKED: [],
      SHIPPED: [],
      COMPLETED: [],
      CANCELLED: [],
    };
    for (const order of filteredOrders) {
      map[order.status].push(order);
    }
    return map;
  }, [filteredOrders]);

  const activeOrder = orders.find((o) => o.id === activeId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const orderId = String(active.id);
    const fromStatus = active.data.current?.status as OrderStatusValue | undefined;
    const toStatus = String(over.id) as OrderStatusValue;

    if (!fromStatus || fromStatus === toStatus) return;

    if (!VALID_TRANSITIONS[fromStatus].includes(toStatus)) {
      setError(
        `Transisi status dari ${ORDER_STATUS_LABELS[fromStatus]} ke ${ORDER_STATUS_LABELS[toStatus]} tidak diizinkan`,
      );
      return;
    }

    setError(null);
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status: toStatus } : order)),
    );

    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toStatus }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Gagal mengubah status, kartu dikembalikan');
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status: fromStatus } : order)),
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Order Board</h1>
          <p className="mt-1 text-sm text-neutral-500">Papan Kanban untuk mengelola alur pesanan</p>
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Cari pesanan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputBase} w-56`}
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as 'ALL' | 'ONLINE' | 'POS')}
            className={inputBase}
          >
            <option value="ALL">Semua Sumber</option>
            <option value="ONLINE">Online</option>
            <option value="POS">POS</option>
          </select>
        </div>
      </div>

      <div className={`p-3 text-sm text-neutral-500 ${cardBase}`}>
        Seret kartu pesanan antar kolom untuk mengubah status, atau klik kartu untuk detail.
      </div>

      {error ? <p className="text-sm text-red">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat papan...</p>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {BOARD_COLUMNS.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                orders={ordersByStatus[status]}
                onCardClick={setOpenOrderId}
              />
            ))}
          </div>
          <DragOverlay>{activeOrder ? <OrderCard order={activeOrder} /> : null}</DragOverlay>
        </DndContext>
      )}

      {openOrderId ? (
        <OrderDetailModal
          orderId={openOrderId}
          onClose={() => setOpenOrderId(null)}
          onStatusChanged={(updated) => {
            setOrders((prev) =>
              prev.map((order) =>
                order.id === updated.id ? { ...order, status: updated.status } : order,
              ),
            );
          }}
        />
      ) : null}
    </div>
  );
}
