import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { PRODUCT_CHANNELS } from '@/server/products/schema';

export const adminProductFilterSchema = z.object({
  q: z.string().trim().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.enum(['active', 'inactive']).optional(),
  channel: z.enum(['WEB', 'POS']).optional(),
  channelFilter: z.enum(PRODUCT_CHANNELS).optional(),
});

export type AdminProductFilter = z.infer<typeof adminProductFilterSchema>;

export function buildAdminProductWhere({
  q,
  categoryId,
  isActive,
  channel,
  channelFilter,
}: AdminProductFilter): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { deletedAt: null };

  if (categoryId) where.categories = { some: { categoryId } };
  if (isActive) where.isActive = isActive === 'active';
  if (channel) where.channel = { in: [channel, 'BOTH'] };
  if (channelFilter) where.channel = channelFilter;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { author: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { isbn: { contains: q, mode: 'insensitive' } },
    ];
  }

  return where;
}
