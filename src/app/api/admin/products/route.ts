import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { computeEffectivePrice } from '@/server/products/pricing';
import { createProductSchema } from '@/server/products/schema';
import { generateUniqueSlug } from '@/server/products/slug';

const listAdminProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  q: z.string().trim().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  stock: z.enum(['instock', 'lowstock', 'outofstock']).optional(),
});

const LOW_STOCK_THRESHOLD = 10;

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = listAdminProductsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { page, limit, q, categoryId, stock } = parsed.data;

    const where: Prisma.ProductWhereInput = {};

    if (categoryId) {
      where.categories = { some: { categoryId } };
    }

    if (stock === 'instock') {
      where.stock = { gt: LOW_STOCK_THRESHOLD };
    } else if (stock === 'lowstock') {
      where.stock = { gt: 0, lte: LOW_STOCK_THRESHOLD };
    } else if (stock === 'outofstock') {
      where.stock = { lte: 0 };
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { author: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          sku: true,
          slug: true,
          title: true,
          author: true,
          price: true,
          costPrice: true,
          preOrderPrice: true,
          isPreOrderActive: true,
          wholesalePrice: true,
          wholesaleMinQty: true,
          discountPercent: true,
          finalPrice: true,
          stock: true,
          isActive: true,
          images: {
            orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            take: 1,
            select: { url: true },
          },
          categories: { select: { category: { select: { id: true, name: true } } } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      items: items.map(({ images, categories, ...product }) => ({
        ...product,
        primaryImageUrl: images[0]?.url ?? null,
        categories: categories.map(({ category }) => category),
      })),
      total,
      page,
      limit,
    });
  },
  { role: 'ADMIN' },
);

export const POST = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { publisher, categoryIds, tagIds, ...data } = parsed.data;

    if (categoryIds.length > 0) {
      const foundCount = await prisma.category.count({ where: { id: { in: categoryIds } } });
      if (foundCount !== categoryIds.length) {
        return NextResponse.json(
          {
            error: 'Validasi gagal',
            issues: { categoryIds: ['Beberapa kategori tidak ditemukan'] },
          },
          { status: 400 },
        );
      }
    }

    if (tagIds.length > 0) {
      const foundCount = await prisma.tag.count({ where: { id: { in: tagIds } } });
      if (foundCount !== tagIds.length) {
        return NextResponse.json(
          { error: 'Validasi gagal', issues: { tagIds: ['Beberapa tag tidak ditemukan'] } },
          { status: 400 },
        );
      }
    }

    const slug = await generateUniqueSlug(data.title, async (candidate) =>
      Boolean(
        await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } }),
      ),
    );

    try {
      const product = await prisma.product.create({
        data: {
          ...data,
          imprint: publisher,
          slug,
          finalPrice: computeEffectivePrice(
            data.price,
            data.discountPercent,
            data.isPreOrderActive,
            data.preOrderPrice,
          ),
          categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
        include: {
          images: true,
          categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
          tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
        },
      });

      return NextResponse.json(
        {
          ...product,
          categories: product.categories.map(({ category }) => category),
          tags: product.tags.map(({ tag }) => tag),
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Validasi gagal', issues: { sku: ['SKU sudah digunakan'] } },
          { status: 409 },
        );
      }
      throw error;
    }
  },
  { role: 'ADMIN' },
);
