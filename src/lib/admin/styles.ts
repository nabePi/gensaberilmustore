/**
 * Admin-only style constants, restyled to the TailAdmin visual language
 * (https://tailadmin.com/) while keeping the store's brand accent color.
 *
 * These are intentionally separate from `src/lib/styles.ts`, which is shared
 * with the storefront — do not import from that file here, and do not import
 * from this file outside `src/app/admin/**` / `src/components/admin/**`.
 */

export const adminBtnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300 disabled:opacity-50';

export const adminBtnOutline =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50';

export const adminBtnDanger =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 disabled:opacity-50';

export const adminBtnPrimarySm =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300 disabled:opacity-50';

export const adminBtnOutlineSm =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50';

export const adminBtnGhostSm =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50';

export const adminInputBase =
  'h-11 w-full appearance-none rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-foreground shadow-theme-xs outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:bg-neutral-50 disabled:text-neutral-400';

export const adminTextareaBase =
  'w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-foreground shadow-theme-xs outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:bg-neutral-50 disabled:text-neutral-400';

export const adminCardBase = 'rounded-xl border border-neutral-200 bg-white shadow-theme-sm';

export const adminCardPad = 'p-4 sm:p-6';

export const adminBadgeBase =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium';

export type AdminBadgeTone = 'brand' | 'success' | 'warning' | 'error' | 'neutral' | 'info';

const ADMIN_BADGE_TONE_CLASSES: Record<AdminBadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-green/10 text-green',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red/10 text-red',
  neutral: 'bg-neutral-100 text-neutral-500',
  info: 'bg-navy/10 text-navy',
};

export function adminBadgeTone(tone: AdminBadgeTone): string {
  return `${adminBadgeBase} ${ADMIN_BADGE_TONE_CLASSES[tone]}`;
}

export const adminLabelBase = 'text-sm font-medium text-neutral-700';

export const adminHelpText = 'text-xs text-neutral-500';

export const adminErrorText = 'text-xs text-red';

export const adminTableWrap = `overflow-x-auto ${adminCardBase}`;

export const adminTableHeadRow =
  'border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500';

export const adminTableHeadCell = 'px-4 py-3 sm:px-6';

export const adminTableRow = 'border-b border-neutral-100 last:border-0 hover:bg-neutral-50';

export const adminTableCell = 'px-4 py-3 sm:px-6';
