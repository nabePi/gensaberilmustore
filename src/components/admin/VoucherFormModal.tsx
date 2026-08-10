'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AdminModal } from '@/components/admin/AdminModal';
import { btnOutline, btnSolid, inputBase } from '@/lib/styles';

export type AdminVoucherDetail = {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENT' | 'FIXED';
  value: number;
  maxDiscount: number | null;
  minPurchase: number;
  channel: 'ALL' | 'ONLINE' | 'POS';
  quota: number | null;
  perUserLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

const voucherFormSchema = z.object({
  code: z.string().trim().min(1, 'Kode wajib diisi').max(30, 'Kode maksimal 30 karakter'),
  description: z.string().trim().optional(),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.coerce.number().int('Nilai harus bilangan bulat').positive('Nilai harus lebih dari 0'),
  maxDiscount: z.string().optional(),
  minPurchase: z.coerce.number().int().min(0, 'Minimal 0'),
  channel: z.enum(['ALL', 'ONLINE', 'POS']),
  quota: z.string().optional(),
  perUserLimit: z.string().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean(),
});

type VoucherFormValues = z.infer<typeof voucherFormSchema>;

function toDatetimeLocal(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 16);
}

function toNullableInt(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function VoucherFormModal({
  voucher,
  onClose,
  onSaved,
}: {
  voucher: AdminVoucherDetail | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: voucher
      ? {
          code: voucher.code,
          description: voucher.description ?? '',
          type: voucher.type,
          value: voucher.value,
          maxDiscount: voucher.maxDiscount != null ? String(voucher.maxDiscount) : '',
          minPurchase: voucher.minPurchase,
          channel: voucher.channel,
          quota: voucher.quota != null ? String(voucher.quota) : '',
          perUserLimit: voucher.perUserLimit != null ? String(voucher.perUserLimit) : '',
          startsAt: toDatetimeLocal(voucher.startsAt),
          expiresAt: toDatetimeLocal(voucher.expiresAt),
          isActive: voucher.isActive,
        }
      : {
          type: 'PERCENT',
          minPurchase: 0,
          channel: 'ALL',
          isActive: true,
        },
  });

  const type = watch('type');

  async function onSubmit(values: VoucherFormValues) {
    setApiError(null);
    setSubmitting(true);

    const payload = {
      code: values.code,
      description: values.description?.trim() || null,
      type: values.type,
      value: values.value,
      maxDiscount: values.type === 'PERCENT' ? toNullableInt(values.maxDiscount) : null,
      minPurchase: values.minPurchase,
      channel: values.channel,
      quota: toNullableInt(values.quota),
      perUserLimit: toNullableInt(values.perUserLimit),
      startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : null,
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
      isActive: values.isActive,
    };

    const url = voucher ? `/api/admin/vouchers/${voucher.id}` : '/api/admin/vouchers';
    const method = voucher ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    setSubmitting(false);

    if (!response.ok) {
      setApiError(data.error ?? 'Gagal menyimpan voucher');
      return;
    }

    onSaved();
  }

  return (
    <AdminModal
      title={voucher ? 'Edit Voucher' : 'Tambah Voucher'}
      onClose={onClose}
      widthClassName="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kode Voucher" error={errors.code?.message}>
            <input {...register('code')} className={`${inputBase} uppercase`} />
          </Field>
          <Field label="Kanal" error={errors.channel?.message}>
            <select {...register('channel')} className={inputBase}>
              <option value="ALL">Semua Kanal</option>
              <option value="ONLINE">Online</option>
              <option value="POS">POS</option>
            </select>
          </Field>
          <Field label="Tipe" error={errors.type?.message}>
            <select {...register('type')} className={inputBase}>
              <option value="PERCENT">Persentase</option>
              <option value="FIXED">Potongan Tetap</option>
            </select>
          </Field>
          <Field
            label={type === 'PERCENT' ? 'Nilai (%)' : 'Nilai (Rp)'}
            error={errors.value?.message}
          >
            <input type="number" {...register('value')} className={inputBase} />
          </Field>
          {type === 'PERCENT' ? (
            <Field label="Maks. Diskon (Rp, opsional)" error={errors.maxDiscount?.message}>
              <input type="number" {...register('maxDiscount')} className={inputBase} />
            </Field>
          ) : null}
          <Field label="Minimal Belanja (Rp)" error={errors.minPurchase?.message}>
            <input type="number" {...register('minPurchase')} className={inputBase} />
          </Field>
          <Field label="Kuota (opsional)" error={errors.quota?.message}>
            <input type="number" {...register('quota')} className={inputBase} />
          </Field>
          <Field label="Batas per Pengguna (opsional)" error={errors.perUserLimit?.message}>
            <input type="number" {...register('perUserLimit')} className={inputBase} />
          </Field>
          <Field label="Mulai Berlaku (opsional)" error={errors.startsAt?.message}>
            <input type="datetime-local" {...register('startsAt')} className={inputBase} />
          </Field>
          <Field label="Berakhir (opsional)" error={errors.expiresAt?.message}>
            <input type="datetime-local" {...register('expiresAt')} className={inputBase} />
          </Field>
        </div>

        <Field label="Deskripsi (opsional)" error={errors.description?.message}>
          <textarea rows={2} {...register('description')} className={inputBase} />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isActive')} className="h-4 w-4" />
          Aktif
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
