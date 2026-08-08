import { z } from 'zod';

const cityFields = {
  name: z.string().trim().min(1, 'Nama kota wajib diisi'),
  province: z.string().trim().min(1, 'Provinsi wajib diisi'),
  shippingCost: z.number().int().min(0, 'Ongkir tidak valid'),
  isActive: z.boolean().default(true),
};

export const createCitySchema = z.object(cityFields);
export const updateCitySchema = z.object(cityFields).partial();

export const listCitiesQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
});
