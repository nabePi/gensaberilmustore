import { z } from 'zod';

const BLOG_POST_STATUSES = ['DRAFT', 'PUBLISHED'] as const;

const blogPostFields = {
  title: z.string().trim().min(1, 'Judul wajib diisi').max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung')
    .optional(),
  excerpt: z.string().trim().max(500).default(''),
  contentHtml: z.string().trim().min(1, 'Konten wajib diisi'),
  coverImageUrl: z.string().trim().min(1).nullable().optional(),
  author: z.string().trim().min(1, 'Penulis wajib diisi').max(100).default('Redaksi'),
  tags: z.array(z.string().trim().min(1)).max(10).default([]),
  status: z.enum(BLOG_POST_STATUSES).default('DRAFT'),
};

export const createBlogPostSchema = z.object(blogPostFields);

export const updateBlogPostSchema = z.object(blogPostFields).partial();

export const blogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
  status: z.enum(BLOG_POST_STATUSES).optional(),
});
