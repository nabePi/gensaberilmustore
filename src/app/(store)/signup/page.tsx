'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { btnSolid, inputBase } from '@/lib/styles';

function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return `62${digits}`;
}

const signupSchema = z
  .object({
    name: z.string().min(3, 'Nama minimal 3 karakter'),
    email: z.string().email('Format email tidak valid'),
    whatsappNumber: z
      .string()
      .min(1, 'Nomor WhatsApp wajib diisi')
      .transform((val) => normalizePhone(val))
      .pipe(z.string().regex(/^628[1-9][0-9]{6,10}$/, 'Format nomor WhatsApp tidak valid')),
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

type SignupFormValues = z.infer<typeof signupSchema>;

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupFormValues) {
    setApiError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error ?? 'Gagal mendaftar. Silakan coba lagi.');
        setSubmitting(false);
        return;
      }

      const next = searchParams.get('next');
      router.push(next && next.startsWith('/') ? next : '/member/dashboard');
      router.refresh();
    } catch {
      setApiError('Gagal mendaftar. Silakan coba lagi.');
      setSubmitting(false);
    }
  }

  return (
    <div className="container-prototype flex justify-center py-12">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8">
        <h1 className="text-2xl font-bold text-foreground">Buat Akun Baru</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Daftar sekarang dan nikmati kemudahan berbelanja.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">Nama Lengkap</label>
            <input
              type="text"
              placeholder="Masukkan nama lengkap"
              {...register('name')}
              className={inputBase}
            />
            {errors.name ? <p className="text-xs text-red">{errors.name.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">Email</label>
            <input
              type="email"
              placeholder="nama@email.com"
              {...register('email')}
              className={inputBase}
            />
            {errors.email ? <p className="text-xs text-red">{errors.email.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">Nomor WhatsApp</label>
            <div className="flex items-center gap-2">
              <span className="flex h-10 items-center rounded-md border border-neutral-300 bg-neutral-50 px-3 text-sm text-neutral-600">
                +62
              </span>
              <input
                type="tel"
                placeholder="812-3456-7890"
                {...register('whatsappNumber', {
                  onChange: (e) => {
                    e.target.value = formatPhoneDisplay(e.target.value);
                  },
                })}
                className={inputBase}
              />
            </div>
            {errors.whatsappNumber ? (
              <p className="text-xs text-red">{errors.whatsappNumber.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">Password</label>
            <input
              type="password"
              placeholder="Buat password"
              {...register('password')}
              className={inputBase}
            />
            {errors.password ? <p className="text-xs text-red">{errors.password.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">Konfirmasi Password</label>
            <input
              type="password"
              placeholder="Ulangi password"
              {...register('confirmPassword')}
              className={inputBase}
            />
            {errors.confirmPassword ? (
              <p className="text-xs text-red">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          {apiError ? <p className="text-sm text-red">{apiError}</p> : null}

          <button type="submit" disabled={submitting} className={`${btnSolid} mt-2`}>
            {submitting ? 'Memproses...' : 'Daftar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
