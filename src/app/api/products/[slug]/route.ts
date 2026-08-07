import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

const RELATED_PRODUCTS_TAKE = 8;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      title: true,
      subtitle: true,
      author: true,
      imprint: true,
      price: true,
      finalPrice: true,
      discountPercent: true,
      stock: true,
      weightGram: true,
      pageCount: true,
      coverType: true,
      publishYear: true,
      description: true,
      tocText: true,
      highlightsText: true,
      ribbonType: true,
      ribbonText: true,
      images: {
        orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
        select: { id: true, url: true, altText: true, isPrimary: true, position: true },
      },
      categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
      tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
    },
  });

  if (!product) {
    return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
  }

  const categoryIds = product.categories.map(({ category }) => category.id);

  const relatedProducts =
    categoryIds.length > 0
      ? await prisma.product.findMany({
          where: {
            isActive: true,
            id: { not: product.id },
            categories: { some: { categoryId: { in: categoryIds } } },
          },
          take: RELATED_PRODUCTS_TAKE,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            slug: true,
            title: true,
            price: true,
            finalPrice: true,
            discountPercent: true,
            images: {
              orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
              take: 1,
              select: { url: true },
            },
          },
        })
      : [];

  const { imprint, categories, tags, ...rest } = product;

  return NextResponse.json({
    ...rest,
    publisher: imprint,
    categories: categories.map(({ category }) => category),
    tags: tags.map(({ tag }) => tag),
    relatedProducts: relatedProducts.map(({ images, ...relatedProduct }) => ({
      ...relatedProduct,
      primaryImageUrl: images[0]?.url ?? null,
    })),
  });
}
