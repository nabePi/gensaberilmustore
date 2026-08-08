import type { KidsSectionKey, Prisma } from '@prisma/client';

import type { ProductCardData } from '@/components/product/ProductCard';
import { prisma } from '@/lib/db';

const FALLBACK_SECTION_TAKE = 8;

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  author: true,
  price: true,
  finalPrice: true,
  discountPercent: true,
  stock: true,
  isActive: true,
  ribbonType: true,
  ribbonText: true,
  images: {
    orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
    take: 1,
    select: { url: true },
  },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

function toCardData(product: CardRow): ProductCardData {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    author: product.author,
    price: product.price,
    finalPrice: product.finalPrice,
    discountPercent: product.discountPercent,
    stock: product.stock,
    ribbonType: product.ribbonType as ProductCardData['ribbonType'],
    ribbonText: product.ribbonText,
    primaryImageUrl: product.images[0]?.url ?? null,
  };
}

async function getFallbackProducts(): Promise<ProductCardData[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: FALLBACK_SECTION_TAKE,
    select: cardSelect,
  });
  return rows.map(toCardData);
}

async function getSectionProducts(key: KidsSectionKey): Promise<ProductCardData[]> {
  const rows = await prisma.kidsSectionProduct.findMany({
    where: { sectionKey: key },
    orderBy: { position: 'asc' },
    select: { product: { select: cardSelect } },
  });

  const active = rows.map((row) => row.product).filter((product) => product.isActive);

  if (active.length > 0) {
    return active.map(toCardData);
  }

  return getFallbackProducts();
}

export function getKidsConfig() {
  return prisma.kidsConfig.findUnique({ where: { id: 1 } });
}

export async function getKidsData() {
  const [config, popularProducts, discountProducts] = await Promise.all([
    getKidsConfig(),
    getSectionProducts('POPULAR'),
    getSectionProducts('DISCOUNT'),
  ]);

  return { config, popularProducts, discountProducts };
}
