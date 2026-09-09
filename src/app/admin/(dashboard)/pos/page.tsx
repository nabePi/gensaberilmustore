'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '@/components/admin/ui/Table';
import {
  adminBtnOutline,
  adminBtnPrimary,
  adminBtnPrimarySm,
  adminCardBase,
  adminInputBase,
  adminTextareaBase,
} from '@/lib/admin/styles';
import { formatCurrency } from '@/lib/format';
import { handleImageError } from '@/lib/image';
import { computeUnitPrice } from '@/server/products/pricing';

declare global {
  interface Window {
    snap?: {
      pay: (
        snapToken: string,
        callbacks: {
          onSuccess: () => void;
          onPending: () => void;
          onError: () => void;
          onClose: () => void;
        },
      ) => void;
    };
  }
}

const SNAP_ENABLED = process.env.NEXT_PUBLIC_MIDTRANS_SNAP_ENABLED === 'true';
const SNAP_SCRIPT_URL =
  process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';

function QuantityInput({
  quantity,
  stock,
  onChange,
}: {
  quantity: number;
  stock: number;
  onChange: (quantity: number) => void;
}) {
  const [draft, setDraft] = useState(String(quantity));
  const [prevQuantity, setPrevQuantity] = useState(quantity);

  if (quantity !== prevQuantity) {
    setPrevQuantity(quantity);
    setDraft(String(quantity));
  }

  function commit(value: string) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      setDraft(String(quantity));
      return;
    }
    const clamped = Math.min(parsed, stock);
    setDraft(String(clamped));
    if (clamped !== quantity) onChange(clamped);
  }

  return (
    <input
      type="number"
      min={1}
      max={stock}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => commit(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className="w-14 rounded-lg border border-neutral-300 px-1 py-1 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

type CatalogProduct = {
  id: string;
  sku: string;
  title: string;
  author: string;
  finalPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  stock: number;
  primaryImageUrl: string | null;
  categories: { id: string; name: string }[];
};

type CategoryNode = { id: string; name: string; children: CategoryNode[] };

type CartLine = {
  productId: string;
  title: string;
  finalPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  stock: number;
  quantity: number;
};

function unitPriceOf(line: CartLine): number {
  return computeUnitPrice(
    line.finalPrice,
    line.quantity,
    line.wholesalePrice,
    line.wholesaleMinQty,
  );
}

function isWholesaleApplied(line: CartLine): boolean {
  return (
    line.wholesalePrice != null &&
    line.wholesaleMinQty != null &&
    line.quantity >= line.wholesaleMinQty
  );
}

type PosOrderSummary = {
  id: string;
  orderNumber: string;
  total: number;
  manualPaymentCode: number | null;
  createdAt: string;
  receiverName: string;
};

type PosPaymentMethod = 'POS_CASH' | 'POS_GATEWAY' | 'POS_QRIS';

const PAYMENT_METHOD_OPTIONS: { value: PosPaymentMethod; label: string }[] = SNAP_ENABLED
  ? [
      { value: 'POS_CASH', label: 'Tunai' },
      { value: 'POS_GATEWAY', label: 'Payment Gateway' },
    ]
  : [
      { value: 'POS_CASH', label: 'Tunai' },
      { value: 'POS_QRIS', label: 'QRIS' },
    ];

type PosReceiptState = {
  orderId: string;
  orderNumber: string;
  paymentMethod: PosPaymentMethod;
  paymentStatus: 'paid' | 'checking' | 'awaiting' | 'cancelled';
  total?: number;
};

function flattenCategories(
  nodes: CategoryNode[],
  depth = 0,
): { id: string; name: string; depth: number }[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenCategories(node.children, depth + 1),
  ]);
}

export default function AdminPosPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; depth: number }[]>([]);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRemoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('POS_CASH');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [note, setNote] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const snapFailedRef = useRef(false);

  const [receipt, setReceipt] = useState<PosReceiptState | null>(null);
  const downloadedReceiptOrderIdRef = useRef<string | null>(null);

  const [history, setHistory] = useState<PosOrderSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (
      receipt &&
      receipt.paymentStatus === 'paid' &&
      downloadedReceiptOrderIdRef.current !== receipt.orderId
    ) {
      downloadedReceiptOrderIdRef.current = receipt.orderId;
      const link = document.createElement('a');
      link.href = `/api/admin/pos/receipt/${receipt.orderId}/pdf`;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [receipt]);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data: { categories: CategoryNode[] }) =>
        setCategories(flattenCategories(data.categories)),
      );
  }, []);

  async function loadHistory() {
    setLoadingHistory(true);
    const response = await fetch('/api/admin/pos/transactions?limit=10');
    if (response.ok) {
      const data: { items: PosOrderSummary[] } = await response.json();
      setHistory(data.items);
    }
    setLoadingHistory(false);
  }

  useEffect(() => {
    async function load() {
      setLoadingCatalog(true);
      const params = new URLSearchParams({ limit: '60', channel: 'POS' });
      if (q.trim()) params.set('q', q.trim());
      if (categoryId) params.set('categoryId', categoryId);

      const response = await fetch(`/api/admin/products?${params.toString()}`);
      if (response.ok) {
        const data: { items: CatalogProduct[] } = await response.json();
        setProducts(data.items.filter((product) => product.stock > 0));
      }
      setLoadingCatalog(false);
    }

    load();
  }, [q, categoryId]);

  useEffect(() => {
    async function load() {
      setLoadingHistory(true);
      const response = await fetch('/api/admin/pos/transactions?limit=10');
      if (response.ok) {
        const data: { items: PosOrderSummary[] } = await response.json();
        setHistory(data.items);
      }
      setLoadingHistory(false);
    }

    load();
  }, []);

  useEffect(() => {
    return () => {
      if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current);
      if (toastRemoveTimerRef.current) clearTimeout(toastRemoveTimerRef.current);
    };
  }, []);

  function showToast(message: string) {
    if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current);
    if (toastRemoveTimerRef.current) clearTimeout(toastRemoveTimerRef.current);
    setToastMessage(message);
    setToastVisible(true);
    toastHideTimerRef.current = setTimeout(() => setToastVisible(false), 1000);
    toastRemoveTimerRef.current = setTimeout(() => setToastMessage(null), 1300);
  }

  function addToCart(product: CatalogProduct) {
    const existing = cart.find((line) => line.productId === product.id);
    if (existing && existing.quantity >= product.stock) return;

    setCart((prev) => {
      const existingLine = prev.find((line) => line.productId === product.id);
      if (existingLine) {
        return prev.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          title: product.title,
          finalPrice: product.finalPrice,
          wholesalePrice: product.wholesalePrice,
          wholesaleMinQty: product.wholesaleMinQty,
          stock: product.stock,
          quantity: 1,
        },
      ];
    });
    showToast(`"${product.title}" ditambahkan ke Pesanan`);
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.productId === productId
            ? { ...line, quantity: Math.max(1, Math.min(quantity, line.stock)) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((line) => line.productId !== productId));
  }

  const cartTotal = cart.reduce((sum, line) => sum + unitPriceOf(line) * line.quantity, 0);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  async function refreshPaymentStatus(orderId: string) {
    setReceipt((prev) =>
      prev && prev.orderId === orderId ? { ...prev, paymentStatus: 'checking' } : prev,
    );

    const response = await fetch(`/api/payment/status/${orderId}`);
    if (!response.ok) {
      setReceipt((prev) =>
        prev && prev.orderId === orderId ? { ...prev, paymentStatus: 'awaiting' } : prev,
      );
      return;
    }

    const data: { orderStatus: string } = await response.json();
    const paymentStatus: PosReceiptState['paymentStatus'] =
      data.orderStatus === 'PAID'
        ? 'paid'
        : data.orderStatus === 'CANCELLED'
          ? 'cancelled'
          : 'awaiting';

    setReceipt((prev) => (prev && prev.orderId === orderId ? { ...prev, paymentStatus } : prev));
    if (paymentStatus === 'paid') loadHistory();
  }

  async function openGatewayPayment(orderId: string, orderNumber: string) {
    setCheckoutError(null);

    const paymentResponse = await fetch('/api/payment/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });

    if (!paymentResponse.ok) {
      const data = await paymentResponse.json().catch(() => null);
      setCheckoutError(data?.error ?? 'Gagal memulai pembayaran gateway');
      setReceipt({ orderId, orderNumber, paymentMethod: 'POS_GATEWAY', paymentStatus: 'awaiting' });
      return;
    }

    const { snapToken, redirectUrl } = await paymentResponse.json();

    if (snapFailedRef.current || !window.snap) {
      window.open(redirectUrl, '_blank');
      setReceipt({ orderId, orderNumber, paymentMethod: 'POS_GATEWAY', paymentStatus: 'awaiting' });
      return;
    }

    const showReceiptAndRefresh = () => {
      setReceipt({ orderId, orderNumber, paymentMethod: 'POS_GATEWAY', paymentStatus: 'checking' });
      refreshPaymentStatus(orderId);
    };

    window.snap.pay(snapToken, {
      onSuccess: showReceiptAndRefresh,
      onPending: showReceiptAndRefresh,
      onError: showReceiptAndRefresh,
      onClose: showReceiptAndRefresh,
    });
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    setCheckingOut(true);
    setCheckoutError(null);

    const response = await fetch('/api/admin/pos/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        paymentMethod,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        note: note.trim() || undefined,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setCheckoutError(data?.error ?? 'Checkout gagal, silakan coba lagi');
      setCheckingOut(false);
      return;
    }

    const data: { orderId: string; orderNumber: string; total: number } = await response.json();
    const currentPaymentMethod = paymentMethod;

    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setNote('');
    loadHistory();

    if (currentPaymentMethod === 'POS_CASH') {
      setReceipt({
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        paymentMethod: 'POS_CASH',
        paymentStatus: 'paid',
      });
      setCheckingOut(false);
      return;
    }

    if (currentPaymentMethod === 'POS_QRIS') {
      // Cashier verifies the QRIS payment on the spot, so it's marked paid
      // immediately, like cash — no unique code needed.
      setReceipt({
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        paymentMethod: 'POS_QRIS',
        paymentStatus: 'paid',
        total: data.total,
      });
      setCheckingOut(false);
      return;
    }

    await openGatewayPayment(data.orderId, data.orderNumber);
    setCheckingOut(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {toastMessage ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4">
          <div
            className={`rounded-full bg-brand px-4 py-2 text-center text-sm font-medium text-white shadow-lg transition-opacity duration-300 ${
              toastVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {toastMessage}
          </div>
        </div>
      ) : null}

      {SNAP_ENABLED ? (
        <Script
          src={SNAP_SCRIPT_URL}
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="afterInteractive"
          onError={() => {
            snapFailedRef.current = true;
          }}
        />
      ) : null}
      <PageHeader
        title="Point of Sale"
        description="Penjualan cepat untuk event pameran buku"
        action={
          <span className="inline-flex items-center rounded-full bg-brand px-4 py-1.5 text-base font-bold text-white shadow-sm">
            {cartCount} item
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <input
              type="search"
              placeholder="Cari produk..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={adminInputBase}
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={adminInputBase}
            >
              <option value="">Semua Kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {'—'.repeat(category.depth)} {category.name}
                </option>
              ))}
            </select>
          </div>

          {loadingCatalog ? (
            <p className="text-sm text-neutral-500">Memuat produk...</p>
          ) : products.length === 0 ? (
            <TableEmptyState>Produk tidak ditemukan.</TableEmptyState>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className={`flex flex-col gap-1.5 p-2 text-left transition-colors hover:border-brand ${adminCardBase}`}
                >
                  {product.primaryImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.primaryImageUrl}
                      alt=""
                      className="aspect-square w-full rounded-sm object-cover"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="aspect-square w-full rounded-sm bg-neutral-100" />
                  )}
                  <div>
                    <p className="line-clamp-2 text-xs font-medium text-foreground">
                      {product.title}
                    </p>
                    <p className="text-[11px] text-neutral-500">{product.author}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand">
                      {formatCurrency(product.finalPrice)}
                    </span>
                    <span className="text-[11px] text-neutral-500">Stok {product.stock}</span>
                  </div>
                  {product.wholesalePrice != null && product.wholesaleMinQty != null ? (
                    <p className="text-[10px] text-navy">
                      Grosir {product.wholesaleMinQty}+ pcs:{' '}
                      {formatCurrency(product.wholesalePrice)}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`flex h-fit flex-col gap-4 p-4 ${adminCardBase}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Pesanan</h2>
            {cart.length > 0 ? (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs font-medium text-neutral-500 hover:underline"
              >
                Kosongkan
              </button>
            ) : null}
          </div>

          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">
              Keranjang masih kosong.
              <br />
              Pilih produk dari katalog.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {cart.map((line) => (
                <div key={line.productId} className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{line.title}</p>
                    {isWholesaleApplied(line) ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-neutral-400 line-through">
                          {formatCurrency(line.finalPrice)}
                        </span>
                        <span className="text-xs font-semibold text-brand">
                          {formatCurrency(unitPriceOf(line))}
                        </span>
                        <span className="rounded-full bg-navy/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy">
                          Grosir
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500">
                        {formatCurrency(unitPriceOf(line))}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                      className="h-7 w-7 rounded-lg text-sm text-neutral-600 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50"
                    >
                      −
                    </button>
                    <QuantityInput
                      quantity={line.quantity}
                      stock={line.stock}
                      onChange={(quantity) => updateQuantity(line.productId, quantity)}
                    />
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                      disabled={line.quantity >= line.stock}
                      className="h-7 w-7 rounded-lg text-sm text-neutral-600 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(line.productId)}
                    aria-label={`Hapus ${line.title}`}
                    className="text-neutral-400 hover:text-red"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <strong className="text-lg text-brand">{formatCurrency(cartTotal)}</strong>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="posPaymentMethod" className="text-xs font-medium text-neutral-600">
              Metode Pembayaran
            </label>
            <select
              id="posPaymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
              className={adminInputBase}
            >
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="posCustomerName" className="text-xs font-medium text-neutral-600">
              Nama Pelanggan (opsional)
            </label>
            <input
              id="posCustomerName"
              type="text"
              placeholder="Nama pembeli"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={adminInputBase}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="posCustomerPhone" className="text-xs font-medium text-neutral-600">
              Telepon (opsional)
            </label>
            <input
              id="posCustomerPhone"
              type="text"
              placeholder="08xxxxxxxxxx"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className={adminInputBase}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="posCustomerEmail" className="text-xs font-medium text-neutral-600">
              Email Pelanggan (opsional)
            </label>
            <input
              id="posCustomerEmail"
              type="email"
              placeholder="nama@email.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className={adminInputBase}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="posNotes" className="text-xs font-medium text-neutral-600">
              Catatan (opsional)
            </label>
            <textarea
              id="posNotes"
              rows={2}
              placeholder="Catatan untuk transaksi ini"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={adminTextareaBase}
            />
          </div>

          {checkoutError ? <p className="text-sm text-red">{checkoutError}</p> : null}

          <button
            type="button"
            disabled={cart.length === 0 || checkingOut}
            onClick={handleCheckout}
            className={adminBtnPrimary}
          >
            {checkingOut ? 'Memproses...' : 'Checkout'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Riwayat Transaksi POS</h2>
        </div>

        {loadingHistory ? (
          <p className="text-sm text-neutral-500">Memuat riwayat...</p>
        ) : history.length === 0 ? (
          <TableEmptyState>Belum ada transaksi POS.</TableEmptyState>
        ) : (
          <Table>
            <Thead>
              <Th>No. Transaksi</Th>
              <Th>Pelanggan</Th>
              <Th className="text-right">Total</Th>
              <Th>Waktu</Th>
              <Th />
            </Thead>
            <Tbody>
              {history.map((order) => (
                <Tr key={order.id}>
                  <Td className="font-medium text-foreground">{order.orderNumber}</Td>
                  <Td className="text-neutral-600">{order.receiverName}</Td>
                  <Td className="text-right text-neutral-600">
                    {formatCurrency(
                      order.manualPaymentCode !== null
                        ? order.total + order.manualPaymentCode
                        : order.total,
                    )}
                    {order.manualPaymentCode !== null ? (
                      <span className="block text-xs text-neutral-400">
                        (+kode unik {order.manualPaymentCode.toString().padStart(3, '0')})
                      </span>
                    ) : null}
                  </Td>
                  <Td className="text-neutral-500">
                    {new Date(order.createdAt).toLocaleString('id-ID')}
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => window.open(`/admin/pos/receipt/${order.id}/print`, '_blank')}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      Cetak
                    </button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {receipt ? (
        <AdminModal title="Struk POS" onClose={() => setReceipt(null)}>
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            {receipt.paymentStatus === 'paid' ? (
              <p className="text-sm font-medium text-green">Transaksi berhasil dibuat</p>
            ) : receipt.paymentStatus === 'checking' ? (
              <p className="text-sm text-neutral-500">Memeriksa status pembayaran...</p>
            ) : receipt.paymentStatus === 'cancelled' ? (
              <p className="text-sm font-medium text-red">Pembayaran dibatalkan / ditolak</p>
            ) : (
              <p className="text-sm font-medium text-navy">Menunggu pembayaran dari pelanggan</p>
            )}
            <p className="text-lg font-bold text-foreground">{receipt.orderNumber}</p>
          </div>

          {receipt.paymentMethod === 'POS_QRIS' ? (
            <div className="mb-4 flex flex-col items-center gap-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/qris.jpeg" alt="QRIS Berilmu Bookstore" className="w-56 max-w-full" />
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(receipt.total ?? 0)}
              </p>
              <p className="max-w-xs text-xs text-neutral-500">
                Minta pelanggan scan QRIS di atas sejumlah total tersebut. Kasir memverifikasi
                pembayaran langsung di tempat.
              </p>
            </div>
          ) : null}

          {checkoutError ? (
            <p className="mb-2 text-center text-sm text-red">{checkoutError}</p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            {receipt.paymentMethod === 'POS_GATEWAY' && receipt.paymentStatus === 'awaiting' ? (
              <>
                <button
                  type="button"
                  onClick={() => refreshPaymentStatus(receipt.orderId)}
                  className={adminBtnOutline}
                >
                  Cek Status
                </button>
                <button
                  type="button"
                  onClick={() => openGatewayPayment(receipt.orderId, receipt.orderNumber)}
                  className={adminBtnOutline}
                >
                  Buka Ulang Pembayaran
                </button>
              </>
            ) : null}
            <button type="button" onClick={() => setReceipt(null)} className={adminBtnOutline}>
              Tutup
            </button>
            <button
              type="button"
              onClick={() => window.open(`/admin/pos/receipt/${receipt.orderId}/print`, '_blank')}
              className={adminBtnPrimarySm}
            >
              Cetak
            </button>
          </div>
        </AdminModal>
      ) : null}
    </div>
  );
}
