'use client';

import { useRef, useState } from 'react';

import { btnOutline } from '@/lib/styles';

export type BannerImageItem = {
  id?: string;
  imageUrl: string;
  linkUrl: string;
};

export function BannerImageManager({
  label,
  images,
  onChange,
}: {
  label: string;
  images: BannerImageItem[];
  onChange: (images: BannerImageItem[]) => void;
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
    onChange([...images, { imageUrl: data.url, linkUrl: '' }]);
    setUploading(false);
    event.target.value = '';
  }

  function updateLinkUrl(index: number, linkUrl: string) {
    const next = [...images];
    const current = next[index];
    if (!current) return;
    next[index] = { ...current, linkUrl };
    onChange(next);
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
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
          {uploading ? 'Mengunggah...' : 'Tambah Gambar'}
        </button>
      </div>

      {error ? <p className="text-sm text-red">{error}</p> : null}

      {images.length === 0 ? (
        <p className="text-xs text-neutral-500">
          Belum ada gambar. Klik Tambah Gambar untuk mengunggah.
        </p>
      ) : null}

      {images.map((image, index) => (
        <div
          key={image.id ?? index}
          className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3"
        >
          <div className="flex items-start gap-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.imageUrl}
                alt={`Banner ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={image.linkUrl ?? ''}
                onChange={(e) => updateLinkUrl(index, e.target.value)}
                placeholder="URL tujuan klik (opsional)"
                className="w-full rounded-sm border border-neutral-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Kosongkan jika gambar tidak bisa diklik.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => moveImage(index, -1)}
                disabled={index === 0}
                className="rounded-sm border border-neutral-200 px-2 py-1 text-xs disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveImage(index, 1)}
                disabled={index === images.length - 1}
                className="rounded-sm border border-neutral-200 px-2 py-1 text-xs disabled:opacity-40"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="rounded-sm border border-red px-2 py-1 text-xs text-red"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
