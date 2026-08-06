# Design System — Gensa Berilmu Store

Sumber kebenaran token visual yang diekstrak dari prototype (`prototype/style.css`).

## Font

- **Primary:** Source Sans 3 (Google Fonts, variable weight 200–900).
- **Fallback:** system-ui, sans-serif.
- **Utility:** `font-sans`.

## Warna

### Brand

Aksen utama: **#95271B** (oranye kemerahan).

| Token                      | Utility                               | Catatan                         |
| -------------------------- | ------------------------------------- | ------------------------------- |
| `--color-brand`            | `bg-brand`, `text-brand`              | Default                         |
| `--color-brand-50` … `900` | `bg-brand-50`, `text-brand-700`, dll. | Tints/shades via `color-mix`    |
| Hover solid button         | `#c95d00`                             | Diambil dari `.btn-solid:hover` |

### Neutral

Skala abu-abu yang dipakai di teks, border, dan permukaan.

| Token                 | Utility          | Hex       |
| --------------------- | ---------------- | --------- |
| `--color-neutral-50`  | `bg-neutral-50`  | `#f9fafb` |
| `--color-neutral-100` | `bg-neutral-100` | `#f3f4f6` |
| `--color-neutral-200` | `bg-neutral-200` | `#e5e7eb` |
| `--color-neutral-300` | `bg-neutral-300` | `#d1d5db` |
| `--color-neutral-400` | `bg-neutral-400` | `#9ca3af` |
| `--color-neutral-500` | `bg-neutral-500` | `#6b7280` |
| `--color-neutral-600` | `bg-neutral-600` | `#4b5563` |
| `--color-neutral-700` | `bg-neutral-700` | `#374151` |
| `--color-neutral-800` | `bg-neutral-800` | `#1f2937` |
| `--color-neutral-900` | `bg-neutral-900` | `#111827` |
| `--color-neutral-950` | `bg-neutral-950` | `#0a0a0a` |

### Accents

| Token           | Utility                  | Hex       | Kegunaan                      |
| --------------- | ------------------------ | --------- | ----------------------------- |
| `--color-navy`  | `bg-navy`, `text-navy`   | `#142850` | Label preorder, price overlay |
| `--color-red`   | `bg-red`, `text-red`     | `#dc2626` | Diskon, wishlist aktif, hapus |
| `--color-green` | `bg-green`, `text-green` | `#16a34a` | Stok tersedia, success state  |

### Surfaces

| Token                | Utility           | Nilai                     |
| -------------------- | ----------------- | ------------------------- |
| `--color-background` | `bg-background`   | `#ffffff`                 |
| `--color-foreground` | `text-foreground` | `neutral-950` (`#0a0a0a`) |

## Tipografi

Semua ukuran dalam rem, dengan basis 16px.

| Token         | Utility     | Pixel |
| ------------- | ----------- | ----- |
| `--text-2xs`  | `text-2xs`  | 10px  |
| `--text-xs`   | `text-xs`   | 12px  |
| `--text-sm`   | `text-sm`   | 14px  |
| `--text-base` | `text-base` | 16px  |
| `--text-lg`   | `text-lg`   | 18px  |
| `--text-xl`   | `text-xl`   | 20px  |
| `--text-2xl`  | `text-2xl`  | 24px  |
| `--text-3xl`  | `text-3xl`  | 28px  |
| `--text-4xl`  | `text-4xl`  | 30px  |
| `--text-5xl`  | `text-5xl`  | 32px  |
| `--text-6xl`  | `text-6xl`  | 42px  |

Weights: `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700).

## Spacing

Base 4px. Tailwind spacing scale di-override menjadi pixel-equivalent.

`--spacing-1` = 4px, `--spacing-2` = 8px, `--spacing-3` = 12px, `--spacing-4` = 16px, `--spacing-5` = 20px, dst.

## Border Radius

| Token           | Utility        | Nilai |
| --------------- | -------------- | ----- |
| `--radius-sm`   | `rounded-sm`   | 8px   |
| `--radius-md`   | `rounded-md`   | 10px  |
| `--radius-lg`   | `rounded-lg`   | 14px  |
| `--radius-xl`   | `rounded-xl`   | 20px  |
| `--radius-2xl`  | `rounded-2xl`  | 28px  |
| `--radius-full` | `rounded-full` | 999px |

## Shadow

| Token          | Utility      | Nilai                          |
| -------------- | ------------ | ------------------------------ |
| `--shadow-xs`  | `shadow-xs`  | `0 1px 2px rgba(0,0,0,0.04)`   |
| `--shadow-sm`  | `shadow-sm`  | `0 1px 4px rgba(0,0,0,0.08)`   |
| `--shadow-md`  | `shadow-md`  | `0 4px 24px rgba(0,0,0,0.04)`  |
| `--shadow-lg`  | `shadow-lg`  | `0 8px 32px rgba(0,0,0,0.06)`  |
| `--shadow-xl`  | `shadow-xl`  | `0 12px 28px rgba(0,0,0,0.08)` |
| `--shadow-2xl` | `shadow-2xl` | `0 20px 50px rgba(0,0,0,0.2)`  |

## Breakpoints

Di-override agar sesuai media query prototype.

| Token              | Nilai  |
| ------------------ | ------ |
| `--breakpoint-sm`  | 520px  |
| `--breakpoint-md`  | 768px  |
| `--breakpoint-lg`  | 900px  |
| `--breakpoint-xl`  | 1024px |
| `--breakpoint-2xl` | 1280px |

## Container

Utility `container-prototype` untuk max-width 1320px dengan padding 20px kiri/kanan.

## Cara Pakai

- Semua token didefinisikan di `src/app/globals.css` via Tailwind v4 `@theme`.
- Font di-load via `next/font/google` di `src/app/layout.tsx`.
- Lihat contoh visual di halaman `/styleguide` (dengan `noindex`).

## Referensi File

- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/(styleguide)/styleguide/page.tsx`
- `prototype/style.css`
