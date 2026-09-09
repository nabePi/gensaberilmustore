'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { btnSolid, inputBase } from '@/lib/styles';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
  remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setApiError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
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

      const next = searchParams.get('next');
      router.push(next && next.startsWith('/') ? next : '/member/dashboard');
      router.refresh();
    } catch {
      setApiError('Gagal masuk. Silakan coba lagi.');
      setSubmitting(false);
    }
  }

  return (
    <div className="container-prototype flex justify-center py-12">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8">
        <h1 className="text-2xl font-bold text-foreground">Selamat Datang Kembali</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Masuk ke akun Anda untuk melanjutkan belanja.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
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
            <label className="text-sm font-medium text-neutral-600">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password"
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

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <input type="checkbox" {...register('remember')} />
              Ingat saya
            </label>
            <Link href="/forgot-password" className="text-sm text-brand hover:underline">
              Lupa password?
            </Link>
          </div>

          {apiError ? <p className="text-sm text-red">{apiError}</p> : null}

          <button type="submit" disabled={submitting} className={`${btnSolid} mt-2`}>
            {submitting ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Belum punya akun?{' '}
          <Link href="/signup" className="font-medium text-brand hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
