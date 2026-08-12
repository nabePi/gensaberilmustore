import type { HomepageConfig, HomepageSectionKey, Prisma } from '@prisma/client';

import type { ProductCardData } from '@/components/product/ProductCard';
import { prisma } from '@/lib/db';

const FALLBACK_SECTION_TAKE = 8;

export const HOMEPAGE_SECTIONS: {
  key: HomepageSectionKey;
  title: string;
  subtitle: string;
}[] = [
  { key: 'NEWEST', title: 'Buku Terbaru', subtitle: 'Rilisan terbaru dari GenSa Berilmu' },
  { key: 'BESTSELLER', title: 'Bestseller', subtitle: 'Paling banyak dicari pembaca' },
  {
    key: 'INTERNATIONAL',
    title: 'International Bestseller',
    subtitle: 'Karya penulis dunia pilihan',
  },
  { key: 'KIWARI', title: 'Keislaman Kiwari', subtitle: 'Wawasan Islam kontemporer' },
  { key: 'KLASIK', title: 'Rujukan Islam Klasik', subtitle: 'Karya ulama klasik terpercaya' },
  { key: 'OTHERS', title: 'Lainnya', subtitle: 'Koleksi pilihan lainnya' },
];

const PROMO_IMAGE_FIELD: Partial<Record<HomepageSectionKey, keyof HomepageConfig>> = {
  NEWEST: 'sectionNewestPromoImageUrl',
  BESTSELLER: 'sectionBestsellerPromoImageUrl',
  INTERNATIONAL: 'sectionInternationalPromoImageUrl',
  KIWARI: 'sectionKiwariPromoImageUrl',
  KLASIK: 'sectionKlasikPromoImageUrl',
};

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

export function getHomepageConfig() {
  return prisma.homepageConfig.findUnique({ where: { id: 1 } });
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

async function getSectionProducts(key: HomepageSectionKey): Promise<ProductCardData[]> {
  const rows = await prisma.homepageSectionProduct.findMany({
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
  key: HomepageSectionKey;
  title: string;
  subtitle: string;
  promoImageUrl: string | null;
  products: ProductCardData[];
};

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

function getPromoImageUrl(config: HomepageConfig | null, key: HomepageSectionKey): string | null {
  const field = PROMO_IMAGE_FIELD[key];
  if (!config || !field) return null;
  return config[field] as string;
}

export async function getHomepageData() {
  const [config, banners] = await Promise.all([getHomepageConfig(), getHomepageBanners()]);

  const sections = await Promise.all(
    HOMEPAGE_SECTIONS.map(async (section) => ({
      ...section,
      promoImageUrl: getPromoImageUrl(config, section.key),
      products: await getSectionProducts(section.key),
    })),
  );

  return { config, banners, sections };
}
