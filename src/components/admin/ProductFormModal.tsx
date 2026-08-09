'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AdminModal } from '@/components/admin/AdminModal';
import { btnOutline, btnSolid, inputBase } from '@/lib/styles';
import { COVER_TYPES } from '@/server/products/schema';

export type AdminCategoryOption = { id: string; name: string; depth: number };

export type AdminProductDetail = {
  id: string;
  sku: string;
  title: string;
  subtitle: string;
  author: string;
  imprint: string | null;
  description: string;
  price: number;
  discountPercent: number;
  stock: number;
  weightGram: number;
  pageCount: number;
  coverType: (typeof COVER_TYPES)[number];
  publishYear: number;
  isActive: boolean;
  categories: { id: string; name: string }[];
};

const productFormSchema = z.object({
  sku: z.string().trim().min(1, 'SKU wajib diisi'),
  title: z.string().trim().min(1, 'Judul wajib diisi'),
  subtitle: z.string().trim().optional(),
  author: z.string().trim().min(1, 'Penulis wajib diisi'),
  publisher: z.string().trim().optional(),
  description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
  price: z.coerce.number().int().positive('Harga harus lebih dari 0'),
  discountPercent: z.coerce.number().int().min(0).max(90),
  stock: z.coerce.number().int().min(0, 'Stok tidak boleh negatif'),
  weightGram: z.coerce.number().int().positive('Berat harus lebih dari 0'),
  pageCount: z.coerce.number().int().positive('Jumlah halaman harus lebih dari 0'),
  coverType: z.enum(COVER_TYPES),
  publishYear: z.coerce.number().int().min(1900),
  isActive: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export function ProductFormModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: AdminProductDetail | null;
  categories: AdminCategoryOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [categoryIds, setCategoryIds] = useState<string[]>(
    product?.categories.map((c) => c.id) ?? [],
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          sku: product.sku,
          title: product.title,
          subtitle: product.subtitle,
          author: product.author,
          publisher: product.imprint ?? '',
          description: product.description,
          price: product.price,
          discountPercent: product.discountPercent,
          stock: product.stock,
          weightGram: product.weightGram,
          pageCount: product.pageCount,
          coverType: product.coverType,
          publishYear: product.publishYear,
          isActive: product.isActive,
        }
      : {
          discountPercent: 0,
          coverType: 'SOFTCOVER',
          publishYear: new Date().getFullYear(),
          isActive: true,
        },
  });

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function onSubmit(values: ProductFormValues) {
    setApiError(null);
    setSubmitting(true);

    const payload = { ...values, categoryIds };
    const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products';
    const method = product ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      setApiError(data.error ?? 'Gagal menyimpan produk');
      setSubmitting(false);
      return;
    }

    if (imageFile) {
      const formData = new FormData();
      formData.append('image', imageFile);
      await fetch(`/api/admin/products/${data.id}/images`, { method: 'POST', body: formData });
    }

    setSubmitting(false);
    onSaved();
  }

  return (
    <AdminModal
      title={product ? 'Edit Produk' : 'Tambah Produk'}
      onClose={onClose}
      widthClassName="max-w-3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" error={errors.sku?.message}>
            <input {...register('sku')} className={inputBase} />
          </Field>
          <Field label="Judul" error={errors.title?.message}>
            <input {...register('title')} className={inputBase} />
          </Field>
          <Field label="Subjudul" error={errors.subtitle?.message}>
            <input {...register('subtitle')} className={inputBase} />
          </Field>
          <Field label="Penulis" error={errors.author?.message}>
            <input {...register('author')} className={inputBase} />
          </Field>
          <Field label="Penerbit" error={errors.publisher?.message}>
            <input {...register('publisher')} className={inputBase} />
          </Field>
          <Field label="Tipe Cover" error={errors.coverType?.message}>
            <select {...register('coverType')} className={inputBase}>
              {COVER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Harga (Rp)" error={errors.price?.message}>
            <input type="number" {...register('price')} className={inputBase} />
          </Field>
          <Field label="Diskon (%)" error={errors.discountPercent?.message}>
            <input type="number" {...register('discountPercent')} className={inputBase} />
          </Field>
          <Field label="Stok" error={errors.stock?.message}>
            <input type="number" {...register('stock')} className={inputBase} />
          </Field>
          <Field label="Berat (gram)" error={errors.weightGram?.message}>
            <input type="number" {...register('weightGram')} className={inputBase} />
          </Field>
          <Field label="Jumlah Halaman" error={errors.pageCount?.message}>
            <input type="number" {...register('pageCount')} className={inputBase} />
          </Field>
          <Field label="Tahun Terbit" error={errors.publishYear?.message}>
            <input type="number" {...register('publishYear')} className={inputBase} />
          </Field>
        </div>

        <Field label="Deskripsi" error={errors.description?.message}>
          <textarea rows={4} {...register('description')} className={inputBase} />
        </Field>

        <Field label="Kategori">
          <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-sm border border-neutral-200 p-3">
            {categories.map((category) => (
              <label key={category.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={categoryIds.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                  className="h-4 w-4"
                />
                <span style={{ paddingLeft: category.depth * 12 }}>{category.name}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Gambar Produk">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isActive')} className="h-4 w-4" />
          Aktif (ditampilkan di toko)
        </label>

        {apiError ? <p className="text-sm text-red">{apiError}</p> : null}

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
          <button type="button" onClick={onClose} className={btnOutline}>
            Batal
          </button>
          <button type="submit" disabled={submitting} className={btnSolid}>
            {submitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-neutral-600">{label}</label>
      {children}
      {error ? <p className="text-xs text-red">{error}</p> : null}
    </div>
  );
}
