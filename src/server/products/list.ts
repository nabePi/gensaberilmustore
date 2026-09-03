import type { Prisma } from '@prisma/client';
import type { z } from 'zod';

import { prisma } from '@/lib/db';
import type { listProductsQuerySchema } from '@/server/products/schema';
import { buildTsQuery } from '@/server/products/text-search';

export type ListProductsFilters = z.infer<typeof listProductsQuerySchema>;

export async function listProducts(filters: ListProductsFilters) {
  const { page, limit, q, category, tag, minPrice, maxPrice, inStock, sort } = filters;

  const where: Prisma.ProductWhereInput = { isActive: true };

  if (category) {
    where.categories = { some: { category: { slug: category } } };
  }

  if (tag) {
    where.tags = { some: { tag: { slug: tag } } };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.finalPrice = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
  }

  if (inStock === 'true') {
    where.stock = { gt: 0 };
  } else if (inStock === 'false') {
    where.stock = { lte: 0 };
  }

  if (q) {
    const tsQuery = buildTsQuery(q);
    if (tsQuery) {
      where.OR = [
        { title: { search: tsQuery } },
        { author: { search: tsQuery } },
        { description: { search: tsQuery } },
      ];
    }
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'price_asc'
      ? { finalPrice: 'asc' }
      : sort === 'price_desc'
        ? { finalPrice: 'desc' }
        : sort === 'popular'
          ? { orderItems: { _count: 'desc' } }
          : { createdAt: 'desc' };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        sku: true,
        slug: true,
        title: true,
        subtitle: true,
        author: true,
        price: true,
        discountPercent: true,
        finalPrice: true,
        isPreOrderActive: true,
        stock: true,
        ribbonType: true,
        ribbonText: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
          take: 1,
          select: { url: true },
        },
        categories: { select: { category: { select: { name: true } } } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: items.map(({ images, categories, ...product }) => ({
      ...product,
      primaryImageUrl: images[0]?.url ?? null,
      categories: categories.map(({ category: c }) => c.name),
    })),
    total,
    page,
    limit,
  };
}
