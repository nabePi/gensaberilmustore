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

export type AdminProductImage = {
  id: string;
  url: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
};

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
  images: AdminProductImage[];
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
  const [existingImages, setExistingImages] = useState<AdminProductImage[]>(
    [...(product?.images ?? [])].sort(
      (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position,
    ),
  );
  const [newFiles, setNewFiles] = useState<{ file: File; preview: string }[]>([]);
  const [imageBusy, setImageBusy] = useState(false);
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

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const remaining = 8 - existingImages.length - newFiles.length;
    const additions = Array.from(fileList)
      .slice(0, Math.max(0, remaining))
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
    if (additions.length < fileList.length) {
      setApiError('Maksimal 8 gambar per produk');
    }
    setNewFiles((prev) => [...prev, ...additions]);
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleDeleteImage(image: AdminProductImage) {
    if (!product) return;
    setImageBusy(true);
    const response = await fetch(`/api/admin/products/${product.id}/images/${image.id}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      setExistingImages((prev) => {
        const remaining = prev.filter((img) => img.id !== image.id);
        if (image.isPrimary && remaining.length > 0) {
          return remaining.map((img, i) => ({ ...img, isPrimary: i === 0 }));
        }
        return remaining;
      });
    } else {
      setApiError('Gagal menghapus gambar');
    }
    setImageBusy(false);
  }

  async function handleSetPrimary(image: AdminProductImage) {
    if (!product || image.isPrimary) return;
    setImageBusy(true);
    const response = await fetch(`/api/admin/products/${product.id}/images/${image.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrimary: true }),
    });
    if (response.ok) {
      setExistingImages((prev) =>
        [...prev]
          .map((img) => ({ ...img, isPrimary: img.id === image.id }))
          .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position),
      );
    } else {
      setApiError('Gagal mengatur gambar utama');
    }
    setImageBusy(false);
  }

  async function uploadNewImages(productId: string): Promise<boolean> {
    for (const { file } of newFiles) {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setApiError(data?.error ?? 'Produk tersimpan, tetapi sebagian gambar gagal diunggah');
        return false;
      }
    }
    return true;
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

    if (newFiles.length > 0) {
      const uploaded = await uploadNewImages(data.id);
      if (!uploaded) {
        setSubmitting(false);
        return;
      }
    }

    newFiles.forEach(({ preview }) => URL.revokeObjectURL(preview));
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

        <Field label="Gambar Produk (bisa lebih dari satu)">
          <div className="flex flex-col gap-3">
            {existingImages.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {existingImages.map((image) => (
                  <div
                    key={image.id}
                    className={`relative w-24 overflow-hidden rounded-sm border-2 ${
                      image.isPrimary ? 'border-brand' : 'border-neutral-200'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.altText ?? 'Gambar produk'}
                      className="aspect-[3/4] w-full object-cover"
                    />
                    {image.isPrimary ? (
                      <span className="absolute left-0 top-0 bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        Utama
                      </span>
                    ) : null}
                    <div className="flex flex-col gap-1 p-1.5">
                      {!image.isPrimary ? (
                        <button
                          type="button"
                          disabled={imageBusy}
                          onClick={() => handleSetPrimary(image)}
                          className="text-[11px] font-medium text-brand hover:underline"
                        >
                          Jadikan Utama
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={imageBusy}
                        onClick={() => handleDeleteImage(image)}
                        className="text-[11px] font-medium text-red hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {newFiles.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {newFiles.map(({ file, preview }, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="relative w-24 overflow-hidden rounded-sm border-2 border-dashed border-neutral-300"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={file.name}
                      className="aspect-[3/4] w-full object-cover"
                    />
                    <span className="absolute left-0 top-0 bg-neutral-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      Baru
                    </span>
                    <div className="p-1.5">
                      <button
                        type="button"
                        onClick={() => removeNewFile(index)}
                        className="text-[11px] font-medium text-red hover:underline"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
              className="text-sm"
            />
            <p className="text-xs text-neutral-500">
              Gambar pertama (utama) dipakai di semua halaman; seluruh gambar tampil sebagai
              carousel di halaman detail produk. Maksimal 8 gambar, 5MB per file.
            </p>
          </div>
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
