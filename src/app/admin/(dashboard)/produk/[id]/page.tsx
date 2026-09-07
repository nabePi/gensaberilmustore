'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  ProductForm,
  type AdminCategoryOption,
  type AdminProductDetail,
} from '@/components/admin/ProductForm';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { flattenCategories } from '@/lib/admin/categories';

export default function AdminProdukEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [categories, setCategories] = useState<AdminCategoryOption[]>([]);
  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data: { categories: Parameters<typeof flattenCategories>[0] }) =>
        setCategories(flattenCategories(data.categories)),
      );
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch(`/api/admin/products/${params.id}`);
      if (response.ok) {
        setProduct(await response.json());
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }

    load();
  }, [params.id]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit Produk"
        breadcrumb={[{ label: 'Produk', href: '/admin/produk' }, { label: 'Edit Produk' }]}
      />
      {loading ? (
        <p className="text-sm text-neutral-500">Memuat produk...</p>
      ) : notFound || !product ? (
        <p className="text-sm text-neutral-500">Produk tidak ditemukan.</p>
      ) : (
        <ProductForm
          product={product}
          categories={categories}
          onCancel={() => router.push('/admin/produk')}
          onSaved={() => router.push('/admin/produk')}
        />
      )}
    </div>
  );
}
