'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { btnSolid, inputBase } from '@/lib/styles';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/[A-Za-z]/, 'Password harus mengandung huruf')
      .regex(/[0-9]/, 'Password harus mengandung angka'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordValues) {
    if (!token) {
      setApiError('Tautan reset password tidak valid.');
      return;
    }

    setApiError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...values }),
      });
      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error ?? 'Gagal mereset password. Silakan coba lagi.');
        setSubmitting(false);
        return;
      }

      router.push('/login');
    } catch {
      setApiError('Gagal mereset password. Silakan coba lagi.');
      setSubmitting(false);
    }
  }

  return (
    <div className="container-prototype flex justify-center py-12">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8">
        <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
        <p className="mt-1 text-sm text-neutral-500">Buat password baru untuk akun Anda.</p>

        {!token ? (
          <p className="mt-6 rounded-sm bg-red/5 px-3 py-2 text-sm text-red">
            Tautan reset password tidak valid atau sudah kedaluwarsa.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-neutral-600">Password Baru</label>
              <input
                type="password"
                placeholder="Buat password baru"
                {...register('password')}
                className={inputBase}
              />
              {errors.password ? (
                <p className="text-xs text-red">{errors.password.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-neutral-600">Konfirmasi Password</label>
              <input
                type="password"
                placeholder="Ulangi password baru"
                {...register('confirmPassword')}
                className={inputBase}
              />
              {errors.confirmPassword ? (
                <p className="text-xs text-red">{errors.confirmPassword.message}</p>
              ) : null}
            </div>

            {apiError ? <p className="text-sm text-red">{apiError}</p> : null}

            <button type="submit" disabled={submitting} className={`${btnSolid} mt-2`}>
              {submitting ? 'Memproses...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link href="/login" className="font-medium text-brand hover:underline">
            Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
