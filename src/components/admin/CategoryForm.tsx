'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Card } from '@/components/admin/ui/Card';
import {
  adminBtnOutline,
  adminBtnPrimary,
  adminErrorText,
  adminInputBase,
  adminLabelBase,
} from '@/lib/admin/styles';

export type AdminCategoryDetail = {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
  isActive: boolean;
};

export type AdminCategoryParentOption = { id: string; name: string; depth: number };

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi'),
  parentId: z.string().optional(),
  position: z.coerce.number().int().min(0, 'Urutan tidak boleh negatif'),
  isActive: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export function CategoryForm({
  category,
  parentOptions,
  onCancel,
  onSaved,
}: {
  category: AdminCategoryDetail | null;
  parentOptions: AdminCategoryParentOption[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category
      ? {
          name: category.name,
          parentId: category.parentId ?? '',
          position: category.position,
          isActive: category.isActive,
        }
      : {
          parentId: '',
          position: 0,
          isActive: true,
        },
  });

  async function onSubmit(values: CategoryFormValues) {
    setApiError(null);
    setSubmitting(true);

    const payload = { ...values, parentId: values.parentId ? values.parentId : null };
    const url = category ? `/api/admin/categories/${category.id}` : '/api/admin/categories';
    const method = category ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setApiError(data.error ?? 'Gagal menyimpan kategori');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={adminLabelBase}>Nama Kategori</label>
            <input {...register('name')} className={adminInputBase} />
            {errors.name ? <p className={adminErrorText}>{errors.name.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1">
            <label className={adminLabelBase}>Kategori Induk</label>
            <select {...register('parentId')} className={adminInputBase}>
              <option value="">Tidak ada (kategori utama)</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {'—'.repeat(option.depth)} {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className={adminLabelBase}>Urutan</label>
            <input type="number" {...register('position')} className={adminInputBase} />
            {errors.position ? <p className={adminErrorText}>{errors.position.message}</p> : null}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isActive')} className="h-4 w-4" />
            Aktif (ditampilkan di toko)
          </label>

          {apiError ? <p className="text-sm text-red">{apiError}</p> : null}

          <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
            <button type="button" onClick={onCancel} className={adminBtnOutline}>
              Batal
            </button>
            <button type="submit" disabled={submitting} className={adminBtnPrimary}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Card>
    </form>
  );
}
