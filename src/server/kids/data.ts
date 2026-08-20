import type { KidsSectionTheme, Prisma } from '@prisma/client';

import type { ProductCardData } from '@/components/product/ProductCard';
import { prisma } from '@/lib/db';

export type KidsSectionWithProducts = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  theme: KidsSectionTheme;
  showDiscountTag: boolean;
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

export function getKidsConfig() {
  return prisma.kidsConfig.findUnique({ where: { id: 1 } });
}

export async function getKidsData() {
  const [config, banners, sectionRows] = await Promise.all([
    getKidsConfig(),
    prisma.kidsBanner.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, imageUrl: true, linkUrl: true },
    }),
    prisma.kidsSection.findMany({
      orderBy: { position: 'asc' },
      include: {
        items: {
          orderBy: { position: 'asc' },
          select: { product: { select: cardSelect } },
        },
      },
    }),
  ]);

  const sections: KidsSectionWithProducts[] = sectionRows
    .map((section) => ({
      id: section.id,
      title: section.title,
      subtitle: section.subtitle,
      badge: section.badge,
      theme: section.theme,
      showDiscountTag: section.showDiscountTag,
      products: section.items
        .map((item) => item.product)
        .filter((product) => product.isActive)
        .map(toCardData),
    }))
    .filter((section) => section.products.length > 0);

  return { config, banners, sections };
}
