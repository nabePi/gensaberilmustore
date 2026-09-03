'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import { formatCurrency } from '@/lib/format';
import { btnOutline, btnSolid, btnSolidSm, cardBase, inputBase } from '@/lib/styles';
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
      className="w-14 rounded-sm border border-neutral-200 px-1 py-1 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
  createdAt: string;
  receiverName: string;
};

const PAYMENT_METHOD_OPTIONS: { value: 'POS_CASH' | 'POS_GATEWAY'; label: string }[] = [
  { value: 'POS_CASH', label: 'Tunai' },
  { value: 'POS_GATEWAY', label: 'Payment Gateway' },
];

type PosReceiptState = {
  orderId: string;
  orderNumber: string;
  paymentMethod: 'POS_CASH' | 'POS_GATEWAY';
  paymentStatus: 'paid' | 'checking' | 'awaiting' | 'cancelled';
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
  const [paymentMethod, setPaymentMethod] = useState<'POS_CASH' | 'POS_GATEWAY'>('POS_CASH');
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
      const params = new URLSearchParams({ limit: '60', stock: 'instock' });
      if (q.trim()) params.set('q', q.trim());
      if (categoryId) params.set('categoryId', categoryId);

      const response = await fetch(`/api/admin/products?${params.toString()}`);
      if (response.ok) {
        const data: { items: CatalogProduct[] } = await response.json();
        setProducts(data.items);
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

  function addToCart(product: CatalogProduct) {
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
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

    const data: { orderId: string; orderNumber: string } = await response.json();
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

    await openGatewayPayment(data.orderId, data.orderNumber);
    setCheckingOut(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <Script
        src={SNAP_SCRIPT_URL}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
        onError={() => {
          snapFailedRef.current = true;
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Point of Sale</h1>
          <p className="mt-1 text-sm text-neutral-500">Penjualan cepat untuk event pameran buku</p>
        </div>
        <span className="text-sm font-medium text-neutral-500">{cartCount} item</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <input
              type="search"
              placeholder="Cari produk..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={inputBase}
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputBase}
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
            <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-white py-16 text-center">
              <p className="text-sm text-neutral-500">Produk tidak ditemukan.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className={`flex flex-col gap-2 p-3 text-left transition-colors hover:border-brand ${cardBase}`}
                >
                  {product.primaryImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.primaryImageUrl}
                      alt=""
                      className="h-32 w-full object-cover"
                    />
                  ) : (
                    <div className="h-32 w-full bg-neutral-100" />
                  )}
                  <div>
                    <p className="line-clamp-2 text-sm font-medium text-foreground">
                      {product.title}
                    </p>
                    <p className="text-xs text-neutral-500">{product.author}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-brand">
                      {formatCurrency(product.finalPrice)}
                    </span>
                    <span className="text-xs text-neutral-500">Stok {product.stock}</span>
                  </div>
                  {product.wholesalePrice != null && product.wholesaleMinQty != null ? (
                    <p className="text-[11px] text-navy">
                      Grosir {product.wholesaleMinQty}+ pcs:{' '}
                      {formatCurrency(product.wholesalePrice)}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`flex h-fit flex-col gap-4 p-4 ${cardBase}`}>
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
                        <span className="rounded-sm bg-navy/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy">
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
                      className="h-7 w-7 rounded-sm border border-neutral-200 text-sm hover:bg-neutral-50"
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
                      className="h-7 w-7 rounded-sm border border-neutral-200 text-sm hover:bg-neutral-50 disabled:opacity-40"
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
              className={inputBase}
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
              className={inputBase}
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
              className={inputBase}
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
              className={inputBase}
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
              className={inputBase}
            />
          </div>

          {checkoutError ? <p className="text-sm text-red">{checkoutError}</p> : null}

          <button
            type="button"
            disabled={cart.length === 0 || checkingOut}
            onClick={handleCheckout}
            className={btnSolid}
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
          <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-white py-10 text-center">
            <p className="text-sm text-neutral-500">Belum ada transaksi POS.</p>
          </div>
        ) : (
          <div className={`overflow-x-auto ${cardBase}`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">No. Transaksi</th>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {history.map((order) => (
                  <tr key={order.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-neutral-600">{order.receiverName}</td>
                    <td className="px-4 py-3 text-right text-neutral-600">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(order.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          window.open(`/admin/pos/receipt/${order.id}/print`, '_blank')
                        }
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        Cetak
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

          {checkoutError ? (
            <p className="mb-2 text-center text-sm text-red">{checkoutError}</p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            {receipt.paymentMethod === 'POS_GATEWAY' && receipt.paymentStatus === 'awaiting' ? (
              <>
                <button
                  type="button"
                  onClick={() => refreshPaymentStatus(receipt.orderId)}
                  className={btnOutline}
                >
                  Cek Status
                </button>
                <button
                  type="button"
                  onClick={() => openGatewayPayment(receipt.orderId, receipt.orderNumber)}
                  className={btnOutline}
                >
                  Buka Ulang Pembayaran
                </button>
              </>
            ) : null}
            <button type="button" onClick={() => setReceipt(null)} className={btnOutline}>
              Tutup
            </button>
            <button
              type="button"
              onClick={() => window.open(`/admin/pos/receipt/${receipt.orderId}/print`, '_blank')}
              className={btnSolidSm}
            >
              Cetak
            </button>
          </div>
        </AdminModal>
      ) : null}
    </div>
  );
}
