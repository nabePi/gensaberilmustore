'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { btnSolid, inputBase } from '@/lib/styles';

const forgotPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordValues) {
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      setMessage(data.message ?? 'Jika email terdaftar, tautan reset dikirim');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-prototype flex justify-center py-12">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8">
        <h1 className="text-2xl font-bold text-foreground">Lupa Password</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Masukkan email Anda dan kami akan mengirimkan tautan untuk mereset password.
        </p>

        {message ? (
          <p className="mt-6 rounded-sm bg-green/10 px-3 py-2 text-sm text-green">{message}</p>
        ) : (
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

            <button type="submit" disabled={submitting} className={`${btnSolid} mt-2`}>
              {submitting ? 'Mengirim...' : 'Kirim Tautan Reset'}
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
