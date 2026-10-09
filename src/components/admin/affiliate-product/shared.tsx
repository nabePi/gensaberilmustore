'use client';

import { adminInputBase } from '@/lib/admin/styles';
import { handleImageError } from '@/lib/image';

export type ValueType = 'PERCENT' | 'FIXED';

export const CHANNEL_LABEL = { WEB: 'Website', BOTH: 'Website + POS', POS: 'POS' } as const;

export type RateFormState = {
  commissionType: ValueType;
  commissionValue: string;
  hasDiscount: boolean;
  discountType: ValueType;
  discountValue: string;
  forever: boolean;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export const EMPTY_RATE_FORM: RateFormState = {
  commissionType: 'PERCENT',
  commissionValue: '10',
  hasDiscount: false,
  discountType: 'PERCENT',
  discountValue: '',
  forever: true,
  startsAt: '',
  endsAt: '',
  isActive: true,
};

export function toDateInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Saves the rate for one product. Resolves to an error message, or null on success. */
export async function saveAffiliateProduct(
  productId: string,
  state: RateFormState,
): Promise<string | null> {
  const commissionValue = Number(state.commissionValue);
  if (state.commissionValue.trim() === '' || Number.isNaN(commissionValue)) {
    return 'Besaran komisi wajib diisi';
  }
  const discountValue = Number(state.discountValue);
  if (state.hasDiscount && (state.discountValue.trim() === '' || Number.isNaN(discountValue))) {
    return 'Nilai diskon wajib diisi';
  }
  if (!state.forever && !state.startsAt && !state.endsAt) {
    return 'Isi tanggal mulai atau selesai, atau pilih Selamanya';
  }

  const response = await fetch(`/api/admin/commission-rates/${productId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      commissionType: state.commissionType,
      commissionValue,
      discountType: state.hasDiscount ? state.discountType : null,
      discountValue: state.hasDiscount ? discountValue : null,
      startsAt:
        !state.forever && state.startsAt
          ? new Date(`${state.startsAt}T00:00:00`).toISOString()
          : null,
      endsAt:
        !state.forever && state.endsAt ? new Date(`${state.endsAt}T23:59:59`).toISOString() : null,
      isActive: state.isActive,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const issues = data?.issues ? Object.values(data.issues).flat()[0] : null;
    return (issues as string | undefined) ?? data?.error ?? 'Gagal menyimpan produk afiliasi';
  }
  return null;
}

export function Cover({ url, className }: { url: string | null; className: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={`${className} object-cover`} onError={handleImageError} />
  ) : (
    <div className={`${className} bg-neutral-100`} />
  );
}

function TypeToggle({
  label,
  value,
  onChange,
  idPrefix,
}: {
  label: string;
  value: ValueType;
  onChange: (value: ValueType) => void;
  idPrefix: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-xs font-medium text-neutral-600">{label}</legend>
      <div className="flex gap-4 text-sm text-neutral-700">
        {(['PERCENT', 'FIXED'] as const).map((type) => (
          <label key={type} className="flex items-center gap-1.5">
            <input
              type="radio"
              name={`${idPrefix}Type`}
              checked={value === type}
              onChange={() => onChange(type)}
            />
            {type === 'PERCENT' ? 'Persentase (%)' : 'Nominal (Rp)'}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Commission, buyer discount, period and active switch — shared by the add page and edit modal. */
export function RateSettingsFields({
  form,
  onChange,
}: {
  form: RateFormState;
  onChange: (patch: Partial<RateFormState>) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3">
        <p className="text-sm font-semibold text-foreground">Komisi afiliasi</p>
        <TypeToggle
          label="Jenis komisi"
          idPrefix="affCommission"
          value={form.commissionType}
          onChange={(commissionType) => onChange({ commissionType })}
        />
        <label htmlFor="affCommissionValue" className="text-xs font-medium text-neutral-600">
          {form.commissionType === 'PERCENT' ? 'Komisi (%)' : 'Komisi per unit (Rp)'}
        </label>
        <input
          id="affCommissionValue"
          type="number"
          min={0}
          max={form.commissionType === 'PERCENT' ? 100 : undefined}
          value={form.commissionValue}
          onChange={(e) => onChange({ commissionValue: e.target.value })}
          className={adminInputBase}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={form.hasDiscount}
            onChange={(e) => onChange({ hasDiscount: e.target.checked })}
          />
          Beri potongan harga untuk pembeli lewat link afiliasi (opsional)
        </label>
        {form.hasDiscount ? (
          <>
            <TypeToggle
              label="Jenis potongan"
              idPrefix="affDiscount"
              value={form.discountType}
              onChange={(discountType) => onChange({ discountType })}
            />
            <label htmlFor="affDiscountValue" className="text-xs font-medium text-neutral-600">
              {form.discountType === 'PERCENT' ? 'Potongan (%)' : 'Potongan per unit (Rp)'}
            </label>
            <input
              id="affDiscountValue"
              type="number"
              min={0}
              max={form.discountType === 'PERCENT' ? 100 : undefined}
              value={form.discountValue}
              onChange={(e) => onChange({ discountValue: e.target.value })}
              className={adminInputBase}
            />
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3">
        <p className="text-sm font-semibold text-foreground">Periode berlaku</p>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={form.forever}
            onChange={(e) => onChange({ forever: e.target.checked })}
          />
          Selamanya (jalan terus sampai dinonaktifkan)
        </label>
        {!form.forever ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="affStart" className="text-xs font-medium text-neutral-600">
                Mulai
              </label>
              <input
                id="affStart"
                type="date"
                value={form.startsAt}
                onChange={(e) => onChange({ startsAt: e.target.value })}
                className={adminInputBase}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="affEnd" className="text-xs font-medium text-neutral-600">
                Selesai
              </label>
              <input
                id="affEnd"
                type="date"
                value={form.endsAt}
                min={form.startsAt || undefined}
                onChange={(e) => onChange({ endsAt: e.target.value })}
                className={adminInputBase}
              />
            </div>
          </div>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => onChange({ isActive: e.target.checked })}
        />
        Aktif
      </label>
    </>
  );
}
