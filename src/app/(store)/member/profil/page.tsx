'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { btnOutline, btnSolid, inputBase } from '@/lib/styles';

const profileFormSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  phone: z.string().trim().min(1, 'Nomor telepon wajib diisi'),
  whatsappNumber: z.string().trim().min(1, 'Nomor WhatsApp wajib diisi'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

type ProfileData = {
  name: string | null;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
  avatarUrl: string | null;
};

export default function MemberProfilePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [whatsappSame, setWhatsappSame] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: '', phone: '', whatsappNumber: '' },
  });

  const phoneValue = watch('phone');

  useEffect(() => {
    async function loadProfile() {
      const response = await fetch('/api/member/profile');
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const data: ProfileData = await response.json();
      setEmail(data.email);
      setAvatarUrl(data.avatarUrl);
      setValue('name', data.name ?? '');
      setValue('phone', data.phone ?? '');
      setValue('whatsappNumber', data.whatsappNumber ?? '');
      setWhatsappSame(!data.whatsappNumber || data.whatsappNumber === (data.phone ?? ''));
      setLoading(false);
    }
    loadProfile();
  }, [setValue]);

  useEffect(() => {
    if (whatsappSame) {
      setValue('whatsappNumber', phoneValue ?? '');
    }
  }, [whatsappSame, phoneValue, setValue]);

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setApiError('Ukuran foto maksimal 2MB');
      event.target.value = '';
      return;
    }

    setApiError(null);
    setAvatarUploading(true);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/member/profile/avatar', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        setApiError(data.error ?? 'Gagal mengunggah foto');
      } else {
        setAvatarUrl(data.avatarUrl);
      }
    } catch {
      setApiError('Gagal mengunggah foto');
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  }

  async function handleRemovePhoto() {
    setAvatarUploading(true);
    try {
      await fetch('/api/member/profile/avatar', { method: 'DELETE' });
      setAvatarUrl(null);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function onSubmit(values: ProfileFormValues) {
    setApiError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error ?? 'Gagal menyimpan profil');
        return;
      }

      setSuccessMessage('Profil berhasil disimpan.');
    } catch {
      setApiError('Gagal menyimpan profil');
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Memuat profil...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profil Saya</h1>
        <p className="mt-1 text-sm text-neutral-500">Kelola informasi profil dan foto Anda.</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-4 border-b border-neutral-200 pb-6">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Foto profil"
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-8 w-8"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-600">Foto Profil</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className={btnOutline}
              >
                {avatarUploading ? 'Memproses...' : 'Pilih Foto'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={avatarUploading}
                  className="text-sm font-medium text-red hover:underline"
                >
                  Hapus Foto
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-neutral-400">JPG atau PNG, maks. 2MB</p>
          </div>
        </div>

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
              value={email}
              readOnly
              className={`${inputBase} bg-neutral-50 text-neutral-400`}
            />
            <span className="text-xs text-neutral-400">Email tidak dapat diubah</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-600">No. Telepon</label>
            <input
              type="tel"
              placeholder="08xxxxxxxxxx"
              {...register('phone')}
              className={inputBase}
            />
            {errors.phone ? <p className="text-xs text-red">{errors.phone.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-600">No. WhatsApp</label>
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={whatsappSame}
                  onChange={(event) => setWhatsappSame(event.target.checked)}
                />
                Sama dengan no. telepon
              </label>
            </div>
            <input
              type="tel"
              placeholder="08xxxxxxxxxx"
              {...register('whatsappNumber')}
              readOnly={whatsappSame}
              className={`${inputBase} ${whatsappSame ? 'bg-neutral-50 text-neutral-400' : ''}`}
            />
            {errors.whatsappNumber ? (
              <p className="text-xs text-red">{errors.whatsappNumber.message}</p>
            ) : null}
          </div>

          {apiError ? <p className="text-sm text-red">{apiError}</p> : null}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={isSubmitting} className={btnSolid}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            {successMessage ? <span className="text-sm text-green">{successMessage}</span> : null}
          </div>
        </form>
      </div>
    </div>
  );
}
