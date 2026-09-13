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

export const listDestinationsQuerySchema = z
  .object({
    level: z.enum(['province', 'city', 'district', 'subdistrict']),
    province: z.string().trim().min(1).optional(),
    city: z.string().trim().min(1).optional(),
    district: z.string().trim().min(1).optional(),
    q: z.string().trim().min(1).optional(),
  })
  .refine((value) => !['city', 'district', 'subdistrict'].includes(value.level) || value.province, {
    message: 'Provinsi wajib dipilih',
    path: ['province'],
  })
  .refine((value) => !['district', 'subdistrict'].includes(value.level) || value.city, {
    message: 'Kota/kabupaten wajib dipilih',
    path: ['city'],
  })
  .refine((value) => value.level !== 'subdistrict' || value.district, {
    message: 'Kecamatan wajib dipilih',
    path: ['district'],
  });

export const tariffQuerySchema = z.object({
  destinationId: z.string().uuid('Tujuan tidak valid'),
});
