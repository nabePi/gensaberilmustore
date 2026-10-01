import type { Prisma } from '@prisma/client';

import type { ProductCardData } from '@/components/product/ProductCard';
import { prisma } from '@/lib/db';
import { resolveActiveDiscount } from '@/server/products/pricing';
import { getSoldCounts } from '@/server/products/sold-count';

const FALLBACK_SECTION_TAKE = 8;

export type BannerImage = {
  imageUrl: string;
  linkUrl: string | null;
};

export type HomepageBanners = {
  HERO_MAIN: BannerImage[];
  HERO_SIDE_1: BannerImage[];
  HERO_SIDE_2: BannerImage[];
};

export type HomepageSectionData = {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  promoImageUrl: string;
  backgroundColor: string | null;
  titleColor: string | null;
  products: ProductCardData[];
};

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  author: true,
  price: true,
  finalPrice: true,
  discountPercent: true,
  discountEndDate: true,
  discountPrice: true,
  isPreOrderActive: true,
  stock: true,
  isActive: true,
  channel: true,
  ribbonType: true,
  ribbonText: true,
  images: {
    orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
    take: 1,
    select: { url: true },
  },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

function toCardData(product: CardRow, soldCount: number): ProductCardData {
  const { discountPercent, finalPrice } = product.isPreOrderActive
    ? product
    : resolveActiveDiscount(product);

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    author: product.author,
    price: product.price,
    finalPrice,
    discountPercent,
    discountPrice: product.discountPrice,
    isPreOrderActive: product.isPreOrderActive,
    stock: product.stock,
    ribbonType: product.ribbonType as ProductCardData['ribbonType'],
    ribbonText: product.ribbonText,
    primaryImageUrl: product.images[0]?.url ?? null,
    soldCount,
  };
}

export function getHomepageConfig() {
  return prisma.homepageConfig.findUnique({ where: { id: 1 } });
}

async function getHomepageBanners(): Promise<HomepageBanners> {
  const rows = await prisma.homepageBanner.findMany({
    orderBy: [{ slot: 'asc' }, { position: 'asc' }],
    select: { slot: true, imageUrl: true, linkUrl: true },
  });

  return {
    HERO_MAIN: rows.filter((r) => r.slot === 'HERO_MAIN'),
    HERO_SIDE_1: rows.filter((r) => r.slot === 'HERO_SIDE_1'),
    HERO_SIDE_2: rows.filter((r) => r.slot === 'HERO_SIDE_2'),
  };
}

async function getFallbackProducts(): Promise<ProductCardData[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true, channel: { in: ['WEB', 'BOTH'] } },
    orderBy: { createdAt: 'desc' },
    take: FALLBACK_SECTION_TAKE,
    select: cardSelect,
  });
  const soldCounts = await getSoldCounts(rows.map((row) => row.id));
  return rows.map((row) => toCardData(row, soldCounts[row.id] ?? 0));
}

async function getSectionProducts(
  sectionId: string,
  categoryId: string | null,
): Promise<ProductCardData[]> {
  const [manualRows, categoryRows] = await Promise.all([
    prisma.homepageSectionProduct.findMany({
      where: { sectionId },
      orderBy: { position: 'asc' },
      select: { product: { select: cardSelect } },
    }),
    categoryId
      ? prisma.categoryProduct.findMany({
          where: { categoryId },
          orderBy: { product: { createdAt: 'desc' } },
          select: { product: { select: cardSelect } },
        })
      : Promise.resolve([]),
  ]);

  // Manual picks come first; category products fill in, skipping any already picked.
  const seen = new Set<string>();
  const merged: CardRow[] = [];
  for (const row of [...manualRows, ...categoryRows]) {
    if (seen.has(row.product.id)) continue;
    seen.add(row.product.id);
    merged.push(row.product);
  }

  if (merged.length === 0) {
    return getFallbackProducts();
  }

  const products = merged.filter(
    (product) => product.isActive && (product.channel === 'WEB' || product.channel === 'BOTH'),
  );

  const soldCounts = await getSoldCounts(products.map((product) => product.id));
  return products.map((product) => toCardData(product, soldCounts[product.id] ?? 0));
}

export async function getHomepageData() {
  const [config, banners, sections] = await Promise.all([
    getHomepageConfig(),
    getHomepageBanners(),
    prisma.homepageSection.findMany({
      where: { isEnabled: true },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        key: true,
        title: true,
        subtitle: true,
        promoImageUrl: true,
        backgroundColor: true,
        titleColor: true,
        categoryId: true,
      },
    }),
  ]);

  const sectionsWithProducts = await Promise.all(
    sections.map(async ({ categoryId, ...section }) => ({
      ...section,
      products: await getSectionProducts(section.id, categoryId),
    })),
  );

  return { config, banners, sections: sectionsWithProducts };
}
