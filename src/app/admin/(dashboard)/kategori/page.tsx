'use client';

import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import {
  CategoryFormModal,
  type AdminCategoryDetail,
  type AdminCategoryParentOption,
} from '@/components/admin/CategoryFormModal';
import { badgeBase, btnOutline, btnSolid, btnSolidSm, cardBase } from '@/lib/styles';

type CategoryNode = {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
  isActive: boolean;
  productCount: number;
  children: CategoryNode[];
};

type FlatCategory = AdminCategoryDetail & { productCount: number; depth: number };

function flattenCategories(nodes: CategoryNode[], depth = 0): FlatCategory[] {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      name: node.name,
      parentId: node.parentId,
      position: node.position,
      isActive: node.isActive,
      productCount: node.productCount,
      depth,
    },
    ...flattenCategories(node.children, depth + 1),
  ]);
}

function collectDescendantIds(categories: FlatCategory[], id: string): Set<string> {
  const ids = new Set<string>();
  let frontier = [id];

  while (frontier.length > 0) {
    const next = categories
      .filter((category) => category.parentId && frontier.includes(category.parentId))
      .map((category) => category.id);
    next.forEach((childId) => ids.add(childId));
    frontier = next;
  }

  return ids;
}

export default function AdminKategoriPage() {
  const [categories, setCategories] = useState<FlatCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formTarget, setFormTarget] = useState<FlatCategory | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FlatCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadCategories() {
    setLoading(true);
    const response = await fetch('/api/admin/categories');
    if (response.ok) {
      const data: { categories: CategoryNode[] } = await response.json();
      setCategories(flattenCategories(data.categories));
    }
    setLoading(false);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const data: { categories: CategoryNode[] } = await response.json();
        setCategories(flattenCategories(data.categories));
      }
      setLoading(false);
    }

    load();
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    const response = await fetch(`/api/admin/categories/${deleteTarget.id}`, {
      method: 'DELETE',
    });

    setDeleting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setDeleteError(data.error ?? 'Gagal menghapus kategori');
      return;
    }

    setDeleteTarget(null);
    loadCategories();
  }

  const parentOptions: AdminCategoryParentOption[] =
    formTarget && formTarget !== 'new'
      ? categories
          .filter((category) => {
            if (category.id === formTarget.id) return false;
            const descendantIds = collectDescendantIds(categories, formTarget.id);
            return !descendantIds.has(category.id);
          })
          .map((category) => ({ id: category.id, name: category.name, depth: category.depth }))
      : categories.map((category) => ({
          id: category.id,
          name: category.name,
          depth: category.depth,
        }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kelola Kategori</h1>
          <p className="mt-1 text-sm text-neutral-500">{categories.length} kategori</p>
        </div>
        <button type="button" onClick={() => setFormTarget('new')} className={btnSolid}>
          + Tambah Kategori
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat kategori...</p>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-500">Belum ada kategori.</p>
        </div>
      ) : (
        <div className={`overflow-x-auto ${cardBase}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3 text-right">Jumlah Produk</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td
                    className="cursor-pointer px-4 py-3 font-medium text-foreground"
                    onClick={() => setFormTarget(category)}
                    style={{ paddingLeft: 16 + category.depth * 20 }}
                  >
                    {category.depth > 0 ? '— ' : ''}
                    {category.name}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600">{category.productCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`${badgeBase} ${
                        category.isActive
                          ? 'bg-green/10 text-green'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {category.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(category);
                      }}
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

      {formTarget ? (
        <CategoryFormModal
          category={formTarget === 'new' ? null : formTarget}
          parentOptions={parentOptions}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            loadCategories();
          }}
        />
      ) : null}

      {deleteTarget ? (
        <AdminModal title="Hapus Kategori" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-neutral-600">
            Yakin ingin menghapus <strong>{deleteTarget.name}</strong>?
          </p>
          {deleteError ? <p className="mt-2 text-sm text-red">{deleteError}</p> : null}
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
