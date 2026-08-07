import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { computeFinalPrice } from '@/server/products/pricing';
import { createProductSchema } from '@/server/products/schema';
import { generateUniqueSlug } from '@/server/products/slug';

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
          finalPrice: computeFinalPrice(data.price, data.discountPercent),
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
