'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import { Badge } from '@/components/admin/ui/Badge';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '@/components/admin/ui/Table';
import {
  flattenCategoryTree,
  type AdminCategoryTreeNode,
  type FlatAdminCategory,
} from '@/lib/admin/category-tree';
import { adminBtnOutline, adminBtnPrimary, adminBtnPrimarySm } from '@/lib/admin/styles';

export default function AdminKategoriPage() {
  const [categories, setCategories] = useState<FlatAdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<FlatAdminCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadCategories() {
    setLoading(true);
    const response = await fetch('/api/admin/categories');
    if (response.ok) {
      const data: { categories: AdminCategoryTreeNode[] } = await response.json();
      setCategories(flattenCategoryTree(data.categories));
    }
    setLoading(false);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const data: { categories: AdminCategoryTreeNode[] } = await response.json();
        setCategories(flattenCategoryTree(data.categories));
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kelola Kategori"
        description={`${categories.length} kategori`}
        action={
          <Link href="/admin/kategori/baru" className={adminBtnPrimary}>
            + Tambah Kategori
          </Link>
        }
      />

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat kategori...</p>
      ) : categories.length === 0 ? (
        <TableEmptyState>Belum ada kategori.</TableEmptyState>
      ) : (
        <Table>
          <Thead>
            <Th>Nama</Th>
            <Th className="text-right">Jumlah Produk</Th>
            <Th>Status</Th>
            <Th />
          </Thead>
          <Tbody>
            {categories.map((category) => (
              <Tr key={category.id}>
                <Td className="font-medium text-foreground">
                  <Link
                    href={`/admin/kategori/${category.id}`}
                    style={{ paddingLeft: category.depth * 20 }}
                    className="block"
                  >
                    {category.depth > 0 ? '— ' : ''}
                    {category.name}
                  </Link>
                </Td>
                <Td className="text-right text-neutral-600">{category.productCount}</Td>
                <Td>
                  <Badge tone={category.isActive ? 'success' : 'neutral'}>
                    {category.isActive ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </Td>
                <Td className="text-right">
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
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {deleteTarget ? (
        <AdminModal title="Hapus Kategori" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-neutral-600">
            Yakin ingin menghapus <strong>{deleteTarget.name}</strong>?
          </p>
          {deleteError ? <p className="mt-2 text-sm text-red">{deleteError}</p> : null}
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
