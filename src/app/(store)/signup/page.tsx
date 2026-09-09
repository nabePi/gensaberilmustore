'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { btnSolid, inputBase } from '@/lib/styles';

const PHONE_PREFIX = '62';

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-5 w-5"
      >
        <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-5 w-5"
    >
      <path d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0112 4.5c4.756 0 8.774 3.162 10.066 7.5a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7)].filter(Boolean).join(' - ');
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
    email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
    phone: z
      .string()
      .min(1, 'Nomor telepon wajib diisi')
      .transform((val) => normalizePhone(val))
      .pipe(z.string().regex(/^628[1-9][0-9]{6,10}$/, 'Format nomor telepon tidak valid')),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/[A-Za-z]/, 'Password harus mengandung huruf')
      .regex(/[0-9]/, 'Password harus mengandung angka'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">
              Nama Lengkap <span className="text-red">*</span>
            </label>
            <input
              type="text"
              placeholder="Masukkan nama lengkap"
              {...register('name')}
              className={inputBase}
            />
            {errors.name ? <p className="text-xs text-red">{errors.name.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">
              Email <span className="text-red">*</span>
            </label>
            <input
              type="email"
              placeholder="nama@email.com"
              {...register('email')}
              className={inputBase}
            />
            {errors.email ? <p className="text-xs text-red">{errors.email.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">
              Nomor Telepon / WhatsApp <span className="text-red">*</span>
            </label>
            <div className="flex">
              <span className="flex items-center rounded-sm rounded-r-none border border-r-0 border-neutral-200 bg-neutral-50 px-2.5 py-2.5 text-sm text-neutral-600">
                +{PHONE_PREFIX}
              </span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="812 - 3456 - 7890"
                {...register('phone', {
                  onChange: (e) => {
                    e.target.value = formatPhoneDisplay(e.target.value);
                  },
                })}
                className={`${inputBase} rounded-l-none`}
              />
            </div>
            {errors.phone ? <p className="text-xs text-red">{errors.phone.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">
              Password <span className="text-red">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Buat password"
                {...register('password')}
                className={`${inputBase} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {errors.password ? <p className="text-xs text-red">{errors.password.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">
              Konfirmasi Password <span className="text-red">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Ulangi password"
                {...register('confirmPassword')}
                className={`${inputBase} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                <EyeIcon open={showConfirmPassword} />
              </button>
            </div>
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
