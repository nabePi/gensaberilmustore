'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CategoryForm, type AdminCategoryParentOption } from '@/components/admin/CategoryForm';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { flattenCategoryTree, type AdminCategoryTreeNode } from '@/lib/admin/category-tree';

export default function AdminKategoriBaruPage() {
  const router = useRouter();
  const [parentOptions, setParentOptions] = useState<AdminCategoryParentOption[]>([]);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((res) => res.json())
      .then((data: { categories: AdminCategoryTreeNode[] }) => {
        const flat = flattenCategoryTree(data.categories);
        setParentOptions(flat.map((c) => ({ id: c.id, name: c.name, depth: c.depth })));
      });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tambah Kategori"
        breadcrumb={[{ label: 'Kategori', href: '/admin/kategori' }, { label: 'Tambah Kategori' }]}
      />
      <CategoryForm
        category={null}
        parentOptions={parentOptions}
        onCancel={() => router.push('/admin/kategori')}
        onSaved={() => router.push('/admin/kategori')}
      />
    </div>
  );
}
