'use client';

import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import {
  ProductFormModal,
  type AdminCategoryOption,
  type AdminProductDetail,
} from '@/components/admin/ProductFormModal';
import { formatCurrency } from '@/lib/format';
import { badgeBase, btnOutline, btnSolid, btnSolidSm, cardBase, inputBase } from '@/lib/styles';

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
  primaryImageUrl: string | null;
  categories: { id: string; name: string }[];
};

type CategoryNode = { id: string; name: string; children: CategoryNode[] };

function flattenCategories(nodes: CategoryNode[], depth = 0): AdminCategoryOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenCategories(node.children, depth + 1),
  ]);
}

export default function AdminProdukPage() {
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [categories, setCategories] = useState<AdminCategoryOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stock, setStock] = useState('');
  const [page, setPage] = useState(1);
  const [formTarget, setFormTarget] = useState<AdminProductDetail | 'new' | null>(null);
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
    if (stock) params.set('stock', stock);

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
      if (stock) params.set('stock', stock);

      const response = await fetch(`/api/admin/products?${params.toString()}`);
      if (response.ok) {
        const data: { items: AdminProductListItem[]; total: number } = await response.json();
        setProducts(data.items);
        setTotal(data.total);
      }
      setLoading(false);
    }

    load();
  }, [q, categoryId, stock, page]);

  async function openEdit(product: AdminProductListItem) {
    const response = await fetch(`/api/admin/products/${product.id}`);
    if (response.ok) {
      setFormTarget(await response.json());
    }
  }

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kelola Produk</h1>
          <p className="mt-1 text-sm text-neutral-500">{total} produk ditemukan</p>
        </div>
        <button type="button" onClick={() => setFormTarget('new')} className={btnSolid}>
          + Tambah Produk
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          type="search"
          placeholder="Cari judul / penulis"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className={inputBase}
        />
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className={inputBase}
        >
          <option value="">Semua Kategori</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {'—'.repeat(category.depth)} {category.name}
            </option>
          ))}
        </select>
        <select
          value={stock}
          onChange={(e) => {
            setStock(e.target.value);
            setPage(1);
          }}
          className={inputBase}
        >
          <option value="">Semua Stok</option>
          <option value="instock">Stok Aman</option>
          <option value="lowstock">Stok Menipis</option>
          <option value="outofstock">Stok Habis</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat produk...</p>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-500">Tidak ada produk ditemukan.</p>
        </div>
      ) : (
        <div className={`overflow-x-auto ${cardBase}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">Harga</th>
                <th className="px-4 py-3 text-right">HPP</th>
                <th className="px-4 py-3 text-right">PO</th>
                <th className="px-4 py-3 text-right">Grosir</th>
                <th className="px-4 py-3 text-right">Stok</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td className="cursor-pointer px-4 py-3" onClick={() => openEdit(product)}>
                    <div className="flex items-center gap-2">
                      {product.primaryImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.primaryImageUrl}
                          alt=""
                          className="h-12 w-9 object-cover"
                        />
                      ) : (
                        <div className="h-12 w-9 bg-neutral-100" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{product.title}</p>
                        <p className="text-xs text-neutral-500">
                          {product.author} · {product.sku}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {product.categories.map((c) => c.name).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
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
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600">
                    {product.costPrice != null ? formatCurrency(product.costPrice) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {product.preOrderPrice != null ? (
                      <>
                        <p className="text-neutral-600">{formatCurrency(product.preOrderPrice)}</p>
                        <span
                          className={`${badgeBase} ${
                            product.isPreOrderActive
                              ? 'bg-navy/10 text-navy'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {product.isPreOrderActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </>
                    ) : (
                      <p className="text-neutral-600">-</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600">
                    {product.wholesalePrice != null && product.wholesaleMinQty != null ? (
                      <>
                        <p>{formatCurrency(product.wholesalePrice)}</p>
                        <p className="text-xs text-neutral-400">
                          min {product.wholesaleMinQty} pcs
                        </p>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600">{product.stock}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`${badgeBase} ${
                        product.isActive
                          ? 'bg-green/10 text-green'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {product.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(product)}
                      className="text-sm font-medium text-red hover:underline"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className={btnOutline}
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
            className={btnSolid}
          >
            Selanjutnya
          </button>
        </div>
      ) : null}

      {formTarget ? (
        <ProductFormModal
          product={formTarget === 'new' ? null : formTarget}
          categories={categories}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            loadProducts();
          }}
        />
      ) : null}

      {deleteTarget ? (
        <AdminModal title="Hapus Produk" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-neutral-600">
            Yakin ingin menghapus <strong>{deleteTarget.title}</strong>? Produk akan dinonaktifkan
            dan tidak tampil di toko.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className={btnOutline}>
              Batal
            </button>
            <button type="button" disabled={deleting} onClick={handleDelete} className={btnSolidSm}>
              {deleting ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </AdminModal>
      ) : null}
    </div>
  );
}
