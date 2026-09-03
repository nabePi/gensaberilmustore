import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { computeEffectivePrice } from '@/server/products/pricing';
import { updateProductSchema } from '@/server/products/schema';
import { generateUniqueSlug } from '@/server/products/slug';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteContext>(
  async (_request: NextRequest, { params }) => {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      ...product,
      categories: product.categories.map(({ category }) => category),
      tags: product.tags.map(({ tag }) => tag),
    });
  },
  { role: 'ADMIN' },
);

export const PUT = withAuth<RouteContext>(
  async (request: NextRequest, { params }) => {
    const { id } = await params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { publisher, categoryIds, tagIds, regenerateSlug, ...data } = parsed.data;

    if (categoryIds && categoryIds.length > 0) {
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

    if (tagIds && tagIds.length > 0) {
      const foundCount = await prisma.tag.count({ where: { id: { in: tagIds } } });
      if (foundCount !== tagIds.length) {
        return NextResponse.json(
          { error: 'Validasi gagal', issues: { tagIds: ['Beberapa tag tidak ditemukan'] } },
          { status: 400 },
        );
      }
    }

    const finalPriceUpdate =
      data.price !== undefined ||
      data.discountPercent !== undefined ||
      data.preOrderPrice !== undefined ||
      data.isPreOrderActive !== undefined
        ? {
            finalPrice: computeEffectivePrice(
              data.price ?? existing.price,
              data.discountPercent ?? existing.discountPercent,
              data.isPreOrderActive ?? existing.isPreOrderActive,
              data.preOrderPrice ?? existing.preOrderPrice,
            ),
          }
        : {};

    const slugUpdate = regenerateSlug
      ? {
          slug: await generateUniqueSlug(data.title ?? existing.title, async (candidate) =>
            Boolean(
              await prisma.product.findFirst({
                where: { slug: candidate, NOT: { id } },
                select: { id: true },
              }),
            ),
          ),
        }
      : {};

    try {
      const product = await prisma.$transaction(async (tx) => {
        if (categoryIds) {
          await tx.categoryProduct.deleteMany({ where: { productId: id } });
          if (categoryIds.length > 0) {
            await tx.categoryProduct.createMany({
              data: categoryIds.map((categoryId) => ({ productId: id, categoryId })),
            });
          }
        }

        if (tagIds) {
          await tx.productTag.deleteMany({ where: { productId: id } });
          if (tagIds.length > 0) {
            await tx.productTag.createMany({
              data: tagIds.map((tagId) => ({ productId: id, tagId })),
            });
          }
        }

        return tx.product.update({
          where: { id },
          data: {
            ...data,
            ...(publisher !== undefined ? { imprint: publisher } : {}),
            ...finalPriceUpdate,
            ...slugUpdate,
          },
          include: {
            images: true,
            categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
            tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
          },
        });
      });

      return NextResponse.json({
        ...product,
        categories: product.categories.map(({ category }) => category),
        tags: product.tags.map(({ tag }) => tag),
      });
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

export const DELETE = withAuth<RouteContext>(
  async (_request: NextRequest, { params }) => {
    const { id } = await params;

    const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    await prisma.product.update({ where: { id }, data: { isActive: false } });

    return new NextResponse(null, { status: 204 });
  },
  { role: 'ADMIN' },
);
