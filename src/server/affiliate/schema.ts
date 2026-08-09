import { z } from 'zod';

export const affiliateJoinSchema = z.object({
  payoutBankName: z.string().trim().min(1, 'Nama bank wajib diisi'),
  payoutBankAccount: z.string().trim().min(1, 'Nomor rekening wajib diisi'),
  payoutBankHolder: z.string().trim().min(1, 'Nama pemilik rekening wajib diisi'),
});

export const affiliateProductSelectionSchema = z.object({
  productIds: z.array(z.string().uuid('ID produk tidak valid')),
});
