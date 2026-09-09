'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import { Badge } from '@/components/admin/ui/Badge';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '@/components/admin/ui/Table';
import { flattenCategories, type CategoryNode } from '@/lib/admin/categories';
import {
  adminBtnOutline,
  adminBtnPrimary,
  adminBtnPrimarySm,
  adminInputBase,
} from '@/lib/admin/styles';
import { formatCurrency } from '@/lib/format';
import { PRODUCT_CHANNELS } from '@/server/products/schema';

type AdminCategoryOption = { id: string; name: string; depth: number };

const CHANNEL_LABELS: Record<(typeof PRODUCT_CHANNELS)[number], string> = {
  WEB: 'Website',
  POS: 'POS',
  BOTH: 'Website & POS',
};

type AdminProductListItem = {
  id: string;
  sku: string;
  title: string;
  author: string;
  price: number;
  costPrice: number | null;
  preOrderPrice: number | null;
  isPreOrderActive: boolean;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  discountPercent: number;
  finalPrice: number;
  stock: number;
  isActive: boolean;
  channel: (typeof PRODUCT_CHANNELS)[number];
  primaryImageUrl: string | null;
  categories: { id: string; name: string }[];
};

export default function AdminProdukPage() {
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [categories, setCategories] = useState<AdminCategoryOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminProductListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data: { categories: CategoryNode[] }) =>
        setCategories(flattenCategories(data.categories)),
      );
  }, []);

  async function loadProducts() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q.trim()) params.set('q', q.trim());
    if (categoryId) params.set('categoryId', categoryId);
    if (isActive) params.set('isActive', isActive);
    if (channelFilter) params.set('channelFilter', channelFilter);

    const response = await fetch(`/api/admin/products?${params.toString()}`);
    if (response.ok) {
      const data: { items: AdminProductListItem[]; total: number } = await response.json();
      setProducts(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q.trim()) params.set('q', q.trim());
      if (categoryId) params.set('categoryId', categoryId);
      if (isActive) params.set('isActive', isActive);
      if (channelFilter) params.set('channelFilter', channelFilter);

      const response = await fetch(`/api/admin/products?${params.toString()}`);
      if (response.ok) {
        const data: { items: AdminProductListItem[]; total: number } = await response.json();
        setProducts(data.items);
        setTotal(data.total);
      }
      setLoading(false);
    }

    load();
  }, [q, categoryId, isActive, channelFilter, page]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/admin/products/${deleteTarget.id}`, { method: 'DELETE' });
    setDeleting(false);
    setDeleteTarget(null);
    loadProducts();
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kelola Produk"
        description={`${total} produk ditemukan`}
        action={
          <Link href="/admin/produk/baru" className={adminBtnPrimary}>
            + Tambah Produk
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <input
          type="search"
          placeholder="Cari judul / penulis"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className={adminInputBase}
        />
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className={adminInputBase}
        >
          <option value="">Semua Kategori</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {'—'.repeat(category.depth)} {category.name}
            </option>
          ))}
        </select>
        <select
          value={isActive}
          onChange={(e) => {
            setIsActive(e.target.value);
            setPage(1);
          }}
          className={adminInputBase}
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <select
          value={channelFilter}
          onChange={(e) => {
            setChannelFilter(e.target.value);
            setPage(1);
          }}
          className={adminInputBase}
        >
          <option value="">Semua Channel</option>
          {PRODUCT_CHANNELS.map((channel) => (
            <option key={channel} value={channel}>
              {CHANNEL_LABELS[channel]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat produk...</p>
      ) : products.length === 0 ? (
        <TableEmptyState>Tidak ada produk ditemukan.</TableEmptyState>
      ) : (
        <Table>
          <Thead>
            <Th>Produk</Th>
            <Th>Kategori</Th>
            <Th className="text-right">Harga</Th>
            <Th className="text-right">HPP</Th>
            <Th className="text-right">PO</Th>
            <Th className="text-right">Grosir</Th>
            <Th className="text-right">Stok</Th>
            <Th>Status</Th>
            <Th>Channel</Th>
            <Th />
          </Thead>
          <Tbody>
            {products.map((product) => (
              <Tr key={product.id}>
                <Td>
                  <Link href={`/admin/produk/${product.id}`} className="flex items-center gap-2">
                    {product.primaryImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.primaryImageUrl}
                        alt=""
                        className="h-12 w-9 rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-9 rounded bg-neutral-100" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{product.title}</p>
                      <p className="text-xs text-neutral-500">
                        {product.author} · {product.sku}
                      </p>
                    </div>
                  </Link>
                </Td>
                <Td className="text-neutral-600">
                  {product.categories.map((c) => c.name).join(', ') || '-'}
                </Td>
                <Td className="text-right">
                  {product.discountPercent > 0 ? (
                    <>
                      <p className="text-xs text-neutral-400 line-through">
                        {formatCurrency(product.price)}
                      </p>
                      <p className="font-medium text-foreground">
                        {formatCurrency(product.finalPrice)}
                      </p>
                    </>
                  ) : (
                    <p className="font-medium text-foreground">
                      {formatCurrency(product.finalPrice)}
                    </p>
                  )}
                </Td>
                <Td className="text-right text-neutral-600">
                  {product.costPrice != null ? formatCurrency(product.costPrice) : '-'}
                </Td>
                <Td className="text-right">
                  {product.preOrderPrice != null ? (
                    <>
                      <p className="text-neutral-600">{formatCurrency(product.preOrderPrice)}</p>
                      <Badge tone={product.isPreOrderActive ? 'info' : 'neutral'}>
                        {product.isPreOrderActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </>
                  ) : (
                    <p className="text-neutral-600">-</p>
                  )}
                </Td>
                <Td className="text-right text-neutral-600">
                  {product.wholesalePrice != null && product.wholesaleMinQty != null ? (
                    <>
                      <p>{formatCurrency(product.wholesalePrice)}</p>
                      <p className="text-xs text-neutral-400">min {product.wholesaleMinQty} pcs</p>
                    </>
                  ) : (
                    '-'
                  )}
                </Td>
                <Td className="text-right text-neutral-600">{product.stock}</Td>
                <Td>
                  <Badge tone={product.isActive ? 'success' : 'neutral'}>
                    {product.isActive ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone={product.channel === 'BOTH' ? 'info' : 'neutral'}>
                    {CHANNEL_LABELS[product.channel]}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(product)}
                    className="text-sm font-medium text-red hover:underline"
                  >
                    Hapus
                  </button>
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

      {deleteTarget ? (
        <AdminModal title="Hapus Produk" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-neutral-600">
            Yakin ingin menghapus <strong>{deleteTarget.title}</strong>? Produk akan dinonaktifkan
            dan tidak tampil di toko.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className={adminBtnOutline}>
              Batal
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className={adminBtnPrimarySm}
            >
              {deleting ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </AdminModal>
      ) : null}
    </div>
  );
}
