import { z } from 'zod';

const categoryFields = {
  name: z.string().trim().min(1, 'Nama kategori wajib diisi'),
  parentId: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
};

export const createCategorySchema = z.object(categoryFields);
export const updateCategorySchema = z.object(categoryFields).partial();
