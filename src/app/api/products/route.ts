import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { listProductsQuerySchema } from '@/server/products/schema';
import { buildTsQuery } from '@/server/products/text-search';

export async function GET(request: NextRequest) {
  const parsed = listProductsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { page, limit, q, category, tag, minPrice, maxPrice, inStock, sort } = parsed.data;

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

  return NextResponse.json({
    items: items.map(({ images, categories, ...product }) => ({
      ...product,
      primaryImageUrl: images[0]?.url ?? null,
      categories: categories.map(({ category: c }) => c.name),
    })),
    total,
    page,
    limit,
  });
}
