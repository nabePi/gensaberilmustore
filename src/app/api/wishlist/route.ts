import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import type { ProductCardData } from '@/components/product/ProductCard';
import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { resolveActiveDiscount } from '@/server/products/pricing';
import { addWishlistItemSchema } from '@/server/wishlist/schema';

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  author: true,
  price: true,
  finalPrice: true,
  discountPercent: true,
  discountEndDate: true,
  isPreOrderActive: true,
  stock: true,
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
    isPreOrderActive: product.isPreOrderActive,
    stock: product.stock,
    ribbonType: product.ribbonType as ProductCardData['ribbonType'],
    ribbonText: product.ribbonText,
    primaryImageUrl: product.images[0]?.url ?? null,
  };
}

export const GET = withAuth(async (_request: NextRequest, { user }) => {
  const wishlistItems = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { product: { select: cardSelect } },
  });

  return NextResponse.json({ items: wishlistItems.map((item) => toCardData(item.product)) });
});

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = addWishlistItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: { productId: ['Produk tidak ditemukan'] } },
      { status: 400 },
    );
  }

  await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: user.id, productId: product.id } },
    create: { userId: user.id, productId: product.id },
    update: {},
  });

  return new NextResponse(null, { status: 201 });
});
