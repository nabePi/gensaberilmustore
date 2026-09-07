'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  CategoryForm,
  type AdminCategoryDetail,
  type AdminCategoryParentOption,
} from '@/components/admin/CategoryForm';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import {
  collectDescendantIds,
  flattenCategoryTree,
  type AdminCategoryTreeNode,
  type FlatAdminCategory,
} from '@/lib/admin/category-tree';

export default function AdminKategoriEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [category, setCategory] = useState<AdminCategoryDetail | null>(null);
  const [parentOptions, setParentOptions] = useState<AdminCategoryParentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch('/api/admin/categories');
      const data: { categories: AdminCategoryTreeNode[] } = await response.json();
      const flat: FlatAdminCategory[] = flattenCategoryTree(data.categories);
      const found = flat.find((c) => c.id === params.id);
      if (!found) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCategory({
        id: found.id,
        name: found.name,
        parentId: found.parentId,
        position: found.position,
        isActive: found.isActive,
      });
      const descendantIds = collectDescendantIds(flat, found.id);
      setParentOptions(
        flat
          .filter((c) => c.id !== found.id && !descendantIds.has(c.id))
          .map((c) => ({ id: c.id, name: c.name, depth: c.depth })),
      );
      setLoading(false);
    }

    load();
  }, [params.id]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit Kategori"
        breadcrumb={[{ label: 'Kategori', href: '/admin/kategori' }, { label: 'Edit Kategori' }]}
      />
      {loading ? (
        <p className="text-sm text-neutral-500">Memuat kategori...</p>
      ) : notFound || !category ? (
        <p className="text-sm text-neutral-500">Kategori tidak ditemukan.</p>
      ) : (
        <CategoryForm
          category={category}
          parentOptions={parentOptions}
          onCancel={() => router.push('/admin/kategori')}
          onSaved={() => router.push('/admin/kategori')}
        />
      )}
    </div>
  );
}
