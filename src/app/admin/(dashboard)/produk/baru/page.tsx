'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ProductForm, type AdminCategoryOption } from '@/components/admin/ProductForm';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { flattenCategories } from '@/lib/admin/categories';

export default function AdminProdukBaruPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<AdminCategoryOption[]>([]);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data: { categories: Parameters<typeof flattenCategories>[0] }) =>
        setCategories(flattenCategories(data.categories)),
      );
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tambah Produk"
        breadcrumb={[{ label: 'Produk', href: '/admin/produk' }, { label: 'Tambah Produk' }]}
      />
      <ProductForm
        product={null}
        categories={categories}
        onCancel={() => router.push('/admin/produk')}
        onSaved={() => router.push('/admin/produk')}
      />
    </div>
  );
}
