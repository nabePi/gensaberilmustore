import { z } from 'zod';

export const storeSettingUpdateSchema = z.object({
  defaultCommissionPercent: z.coerce
    .number()
    .min(0, 'Persentase minimal 0')
    .max(100, 'Persentase maksimal 100'),
  qrisStaticCode: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});
