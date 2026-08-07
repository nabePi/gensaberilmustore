import { z } from 'zod';

const CURRENT_YEAR = new Date().getFullYear();

export const COVER_TYPES = ['SOFTCOVER', 'HARDCOVER', 'EBOOK'] as const;
export const RIBBON_TYPES = ['NEW', 'BEST', 'DISCOUNT'] as const;

const productFields = {
  sku: z.string().trim().min(1, 'SKU wajib diisi'),
  title: z.string().trim().min(1, 'Judul wajib diisi'),
  subtitle: z.string().trim().default(''),
  author: z.string().trim().min(1, 'Penulis wajib diisi'),
  publisher: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
  tocText: z.string().optional(),
  highlightsText: z.string().optional(),
  price: z.number().int('Harga harus bilangan bulat').positive('Harga harus lebih dari 0'),
  discountPercent: z.number().int().min(0).max(90).default(0),
  stock: z.number().int().min(0, 'Stok tidak boleh negatif'),
  weightGram: z.number().int().positive('Berat harus lebih dari 0'),
  pageCount: z.number().int().positive('Jumlah halaman harus lebih dari 0'),
  coverType: z.enum(COVER_TYPES),
  publishYear: z
    .number()
    .int()
    .min(1900)
    .max(CURRENT_YEAR + 1),
  categoryIds: z.array(z.string().uuid()).default([]),
  tagIds: z.array(z.string().uuid()).default([]),
  ribbonType: z.enum(RIBBON_TYPES).optional(),
  ribbonText: z.string().optional(),
  isActive: z.boolean().default(true),
};

export const createProductSchema = z.object(productFields);

export const updateProductSchema = z.object(productFields).partial().extend({
  regenerateSlug: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const listProductsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(60).default(20),
    q: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    tag: z.string().trim().min(1).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).default('newest'),
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    {
      message: 'minPrice tidak boleh lebih besar dari maxPrice',
      path: ['minPrice'],
    },
  );
