import { z } from 'zod';

export const storeSettingUpdateSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1),
  address: z.string().trim().min(1),
  defaultShippingCost: z.coerce.number().int().min(0),
  freeShippingMinTotal: z.coerce.number().int().min(0),
  bank1Name: z.string().trim().min(1),
  bank1Number: z.string().trim().min(1),
  bank1Holder: z.string().trim().min(1),
  bank2Name: z.string().trim().min(1),
  bank2Number: z.string().trim().min(1),
  bank2Holder: z.string().trim().min(1),
});
