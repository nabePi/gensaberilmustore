import type { Prisma } from '@prisma/client';
import { cache } from 'react';

import { prisma } from '@/lib/db';

const RELATED_PRODUCTS_TAKE = 8;

export const getProductDetail = cache(async (slug: string) => {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      author: true,
      imprint: true,
      price: true,
      finalPrice: true,
      discountPercent: true,
      isPreOrderActive: true,
      wholesalePrice: true,
      wholesaleMinQty: true,
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
      sku: true,
      images: {
        orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
        select: { id: true, url: true, altText: true, isPrimary: true, position: true },
      },
      categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
      tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
    },
  });

  if (!product) return null;

  const categoryIds = product.categories.map(({ category }) => category.id);

  const relatedSelect = {
    id: true,
    slug: true,
    title: true,
    price: true,
    finalPrice: true,
    discountPercent: true,
    isPreOrderActive: true,
    images: {
      orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
      take: 1,
      select: { url: true },
    },
  } satisfies Prisma.ProductSelect;

  let relatedProducts =
    categoryIds.length > 0
      ? await prisma.product.findMany({
          where: {
            isActive: true,
            id: { not: product.id },
            categories: { some: { categoryId: { in: categoryIds } } },
          },
          take: RELATED_PRODUCTS_TAKE,
          orderBy: { createdAt: 'desc' },
          select: relatedSelect,
        })
      : [];

  if (relatedProducts.length === 0) {
    relatedProducts = await prisma.product.findMany({
      where: { isActive: true, id: { not: product.id } },
      take: RELATED_PRODUCTS_TAKE,
      orderBy: { createdAt: 'desc' },
      select: relatedSelect,
    });
  }

  const { imprint, categories, tags, ...rest } = product;

  return {
    ...rest,
    publisher: imprint,
    categories: categories.map(({ category }) => category),
    tags: tags.map(({ tag }) => tag),
    relatedProducts: relatedProducts.map(({ images, ...relatedProduct }) => ({
      ...relatedProduct,
      primaryImageUrl: images[0]?.url ?? null,
    })),
  };
});

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductDetail>>>;
