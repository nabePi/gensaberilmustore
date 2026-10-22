import { createHmac, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

/** Moota dates have second precision and use the bank's Indonesian local time. */
export function mootaMutationDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value.replace(' ', 'T')}+07:00`);
  if (!Number.isFinite(date.getTime())) return null;
  const roundTrip = new Date(date.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  return roundTrip === value ? date : null;
}

export const mootaMutationSchema = z
  .object({
    mutation_id: z.string().trim().min(1).optional(),
    token: z.string().trim().min(1).optional(),
    bank_id: z.string().trim().min(1),
    date: z
      .string()
      .refine((value) => mootaMutationDate(value) !== null, 'Tanggal mutasi tidak valid'),
    created_at: z.string().optional(),
    amount: z
      .union([z.number(), z.string().regex(/^\d+(?:\.0+)?$/)])
      .pipe(z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
    type: z.enum(['CR', 'DB']),
    bank: z.object({ bank_type: z.string() }).optional(),
  })
  .refine((value) => Boolean(value.mutation_id || value.token), 'ID mutasi wajib diisi');

export const mootaPayloadSchema = z.array(mootaMutationSchema).min(1).max(1000);
export type MootaMutation = z.infer<typeof mootaMutationSchema>;
export type MootaChannel = 'bca' | 'interactive-qris';

/** Interactive QRIS sends a bank date at midnight without a transaction time. */
export function mootaOrderCutoff(
  mutation: MootaMutation,
  receivedAt: Date,
  channel: MootaChannel,
): Date {
  const date = mootaMutationDate(mutation.date)!;
  if (channel !== 'interactive-qris' || !mutation.date.endsWith(' 00:00:00'))
    return new Date(date.getTime() + 999);

  const observedAt = mutation.created_at ? mootaMutationDate(mutation.created_at) : null;
  return new Date(
    Math.min(
      date.getTime() + 24 * 60 * 60 * 1000 - 1,
      observedAt ? observedAt.getTime() + 999 : receivedAt.getTime(),
      receivedAt.getTime(),
    ),
  );
}

export function verifyMootaSignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  return timingSafeEqual(Buffer.from(signature, 'hex'), expected);
}
