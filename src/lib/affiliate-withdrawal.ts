import { formatCurrency } from '@/lib/format';

export const MIN_WITHDRAWAL_AMOUNT = 25_000;

export const AFFILIATE_WITHDRAWAL_TERMS = [
  `Minimal pengajuan pencairan komisi adalah ${formatCurrency(MIN_WITHDRAWAL_AMOUNT)} sebelum potongan.`,
  'Pencairan komisi dikenakan potongan pajak sebesar 2,5%.',
  'Untuk rekening bank selain BCA, biaya admin transfer bank dipotong dari komisi yang dicairkan.',
  'Jumlah yang diterima di rekening adalah nominal pengajuan setelah dipotong pajak dan biaya admin bank jika berlaku.',
] as const;
