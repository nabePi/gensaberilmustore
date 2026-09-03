import type { Prisma } from '@prisma/client';

import type { ProductCardData } from '@/components/product/ProductCard';
import { prisma } from '@/lib/db';

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
  isPreOrderActive: true,
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
    isPreOrderActive: product.isPreOrderActive,
    stock: product.stock,
    ribbonType: product.ribbonType as ProductCardData['ribbonType'],
    ribbonText: product.ribbonText,
    primaryImageUrl: product.images[0]?.url ?? null,
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
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: FALLBACK_SECTION_TAKE,
    select: cardSelect,
  });
  return rows.map(toCardData);
}

async function getSectionProducts(sectionId: string): Promise<ProductCardData[]> {
  const rows = await prisma.homepageSectionProduct.findMany({
    where: { sectionId },
    orderBy: { position: 'asc' },
    select: { product: { select: cardSelect } },
  });

  const active = rows.map((row) => row.product).filter((product) => product.isActive);

  if (active.length > 0) {
    return active.map(toCardData);
  }

  return getFallbackProducts();
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
      },
    }),
  ]);

  const sectionsWithProducts = await Promise.all(
    sections.map(async (section) => ({
      ...section,
      products: await getSectionProducts(section.id),
    })),
  );

  return { config, banners, sections: sectionsWithProducts };
}
