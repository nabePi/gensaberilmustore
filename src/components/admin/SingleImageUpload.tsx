'use client';

import { useRef, useState } from 'react';

import { btnOutline } from '@/lib/styles';

export function SingleImageUpload({
  label,
  imageUrl,
  onChange,
  placeholder = 'Belum ada gambar.',
}: {
  label: string;
  imageUrl: string;
  onChange: (url: string) => void;
  placeholder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/admin/uploads', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Gagal mengunggah gambar');
      setUploading(false);
      return;
    }

    const data: { url: string } = await response.json();
    onChange(data.url);
    setUploading(false);
    event.target.value = '';
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={btnOutline}
        >
          {uploading ? 'Mengunggah...' : imageUrl ? 'Ganti Gambar' : 'Upload Gambar'}
        </button>
      </div>
      {error ? <p className="text-sm text-red">{error}</p> : null}
      {imageUrl ? (
        <div className="h-32 w-full overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={label} className="h-full w-full object-contain" />
        </div>
      ) : (
        <p className="text-xs text-neutral-500">{placeholder}</p>
      )}
    </div>
  );
}
