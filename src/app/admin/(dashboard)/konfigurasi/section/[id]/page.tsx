'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { ProductCardPicker, type ProductCardOption } from '@/components/admin/ProductCardPicker';
import { SingleImageUpload } from '@/components/admin/SingleImageUpload';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import {
  adminBtnOutline,
  adminBtnOutlineSm,
  adminBtnPrimary,
  adminCardBase,
  adminInputBase,
} from '@/lib/admin/styles';
import { handleImageError } from '@/lib/image';

type SectionType = 'REGULAR' | 'PROMO';

type SectionProductForm = {
  productId: string;
  title: string;
  primaryImageUrl: string | null;
  discountPercent: number | '';
  discountEndDate: string;
};

type SectionDetail = {
  title: string;
  subtitle: string;
  promoImageUrl: string;
  isEnabled: boolean;
  backgroundColor: string | null;
  titleColor: string | null;
  type: SectionType;
  products: {
    productId: string;
    title: string;
    primaryImageUrl: string | null;
    discountPercent: number;
    discountEndDate: string | null;
  }[];
};

function formatSaveError(data: unknown): string {
  if (data && typeof data === 'object' && 'issues' in data) {
    const issues = (data as { issues?: Record<string, string[] | string> }).issues;
    if (issues) {
      return Object.entries(issues)
        .map(
          ([field, messages]) =>
            `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`,
        )
        .join(' · ');
    }
  }
  if (data && typeof data === 'object' && 'error' in data) {
    return String((data as { error?: unknown }).error ?? 'Gagal menyimpan');
  }
  return 'Gagal menyimpan section. Periksa kembali data yang diisi.';
}

export default function AdminKonfigurasiSectionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [promoImageUrl, setPromoImageUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('');
  const [titleColor, setTitleColor] = useState('');
  const [type, setType] = useState<SectionType>('REGULAR');
  const [products, setProducts] = useState<SectionProductForm[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch(`/api/admin/config/homepage/sections/${params.id}`);
      if (!response.ok) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data: SectionDetail = await response.json();
      setTitle(data.title);
      setSubtitle(data.subtitle);
      setPromoImageUrl(data.promoImageUrl);
      setIsEnabled(data.isEnabled);
      setBackgroundColor(data.backgroundColor ?? '');
      setTitleColor(data.titleColor ?? '');
      setType(data.type);
      setProducts(
        data.products.map((p) => ({
          productId: p.productId,
          title: p.title,
          primaryImageUrl: p.primaryImageUrl,
          discountPercent: p.discountPercent,
          discountEndDate: p.discountEndDate ?? '',
        })),
      );
      setLoading(false);
    }
    load();
  }, [params.id]);

  function handlePick(product: ProductCardOption) {
    setProducts((prev) => [
      ...prev,
      {
        productId: product.id,
        title: product.title,
        primaryImageUrl: product.primaryImageUrl,
        discountPercent: product.discountPercent,
        discountEndDate: product.discountEndDate?.slice(0, 10) ?? '',
      },
    ]);
  }

  function removeProduct(productId: string) {
    setProducts((prev) => prev.filter((p) => p.productId !== productId));
  }

  function updateProduct(productId: string, patch: Partial<SectionProductForm>) {
    setProducts((prev) => prev.map((p) => (p.productId === productId ? { ...p, ...patch } : p)));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const response = await fetch(`/api/admin/config/homepage/sections/${params.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title,
        subtitle,
        promoImageUrl,
        isEnabled,
        backgroundColor,
        titleColor,
        type,
        products: products.map((p) => ({
          productId: p.productId,
          ...(type === 'PROMO'
            ? {
                discountPercent: p.discountPercent === '' ? undefined : p.discountPercent,
                discountEndDate: p.discountEndDate || undefined,
              }
            : {}),
        })),
      }),
    });

    if (response.ok) {
      router.push('/admin/konfigurasi/section');
      return;
    }

    const data = await response.json().catch(() => null);
    setSaveError(formatSaveError(data));
    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Memuat section...</p>;
  }

  if (notFound) {
    return <p className="text-sm text-neutral-500">Section tidak ditemukan.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kelola Section"
        breadcrumb={[
          { label: 'Section', href: '/admin/konfigurasi/section' },
          { label: title || 'Detail' },
        ]}
        action={
          <button
            type="button"
            onClick={() => router.push('/admin/konfigurasi/section')}
            className={adminBtnOutline}
          >
            Kembali
          </button>
        }
      />

      <div className={`flex flex-col gap-4 p-4 ${adminCardBase}`}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600">Subjudul</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Deskripsi singkat section"
            className={adminInputBase}
          />
        </div>

        <SingleImageUpload
          label="Gambar Promo Section"
          imageUrl={promoImageUrl}
          onChange={setPromoImageUrl}
          placeholder="Upload gambar promo untuk section ini (opsional)."
        />

        <label className="flex items-center gap-2 text-xs font-medium text-neutral-600">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
          />
          Tampilkan section ini di beranda
        </label>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600">Jenis Section</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={type === 'REGULAR'}
                onChange={() => setType('REGULAR')}
              />
              Reguler
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={type === 'PROMO'} onChange={() => setType('PROMO')} />
              Promo
            </label>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600">
              Warna Background (opsional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={backgroundColor || '#dc2626'}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="h-9 w-10 shrink-0 rounded-lg border border-neutral-200 p-0.5"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="Kosongkan untuk tampilan default"
                className={adminInputBase}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600">Warna Judul (opsional)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={titleColor || '#ffffff'}
                onChange={(e) => setTitleColor(e.target.value)}
                className="h-9 w-10 shrink-0 rounded-lg border border-neutral-200 p-0.5"
              />
              <input
                type="text"
                value={titleColor}
                onChange={(e) => setTitleColor(e.target.value)}
                placeholder="Kosongkan untuk tampilan default"
                className={adminInputBase}
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-neutral-400">
          Isi warna background untuk menjadikan section ini banner promo berwarna. Kosongkan
          keduanya untuk tampilan section biasa.
        </p>
      </div>

      <div className={`flex flex-col gap-3 p-4 ${adminCardBase}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Buku di Section Ini</p>
          <button type="button" onClick={() => setPickerOpen(true)} className={adminBtnOutlineSm}>
            + Tambah Buku
          </button>
        </div>

        {products.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada buku di section ini.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((product) => (
              <div
                key={product.productId}
                className="flex flex-col gap-2 rounded-lg border border-neutral-100 p-3 sm:flex-row sm:items-center"
              >
                <div className="flex flex-1 items-center gap-3">
                  {product.primaryImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.primaryImageUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-md bg-neutral-100" />
                  )}
                  <p className="text-sm text-foreground">{product.title}</p>
                </div>

                {type === 'PROMO' ? (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-neutral-500">Diskon (%)</label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={product.discountPercent}
                        onChange={(e) =>
                          updateProduct(product.productId, {
                            discountPercent: e.target.value === '' ? '' : Number(e.target.value),
                          })
                        }
                        className={`${adminInputBase} h-9 w-20`}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-neutral-500">Berakhir</label>
                      <input
                        type="date"
                        value={product.discountEndDate}
                        onChange={(e) =>
                          updateProduct(product.productId, { discountEndDate: e.target.value })
                        }
                        className={`${adminInputBase} h-9`}
                      />
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => removeProduct(product.productId)}
                  className="rounded-lg px-2 py-1 text-xs text-red transition hover:bg-red/10"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {saveError ? <p className="text-sm text-red">{saveError}</p> : null}

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4">
        <button
          type="button"
          onClick={() => router.push('/admin/konfigurasi/section')}
          className={adminBtnOutline}
        >
          Batal
        </button>
        <button type="button" disabled={saving} onClick={handleSave} className={adminBtnPrimary}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>

      {pickerOpen ? (
        <ProductCardPicker
          onClose={() => setPickerOpen(false)}
          alreadySelectedIds={products.map((p) => p.productId)}
          onPick={handlePick}
        />
      ) : null}
    </div>
  );
}
