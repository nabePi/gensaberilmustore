'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { btnSolid, inputBase } from '@/lib/styles';

const adminLoginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

export function AdminLoginForm() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginFormValues>({ resolver: zodResolver(adminLoginSchema) });

  async function onSubmit(values: AdminLoginFormValues) {
    setApiError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error ?? 'Gagal masuk. Silakan coba lagi.');
        setSubmitting(false);
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setApiError('Gagal masuk. Silakan coba lagi.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-600">Email</label>
        <input
          type="email"
          placeholder="admin@gensaberilmu.co.id"
          {...register('email')}
          className={inputBase}
        />
        {errors.email ? <p className="text-xs text-red">{errors.email.message}</p> : null}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-600">Password</label>
        <input
          type="password"
          placeholder="Masukkan password"
          {...register('password')}
          className={inputBase}
        />
        {errors.password ? <p className="text-xs text-red">{errors.password.message}</p> : null}
      </div>

      {apiError ? <p className="text-sm text-red">{apiError}</p> : null}

      <button type="submit" disabled={submitting} className={`${btnSolid} mt-2`}>
        {submitting ? 'Memproses...' : 'Masuk'}
      </button>

      <p className="text-center text-xs text-neutral-400">
        Gunakan email <strong>admin@gensaberilmu.co.id</strong> untuk demo
      </p>
    </form>
  );
}
