import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import type { NextRequest } from 'next/server';

import { env } from '@/env';
import { prisma } from '@/lib/db';
import { getSession } from '@/server/auth';
import { computeUnitPrice } from '@/server/products/pricing';

export const GUEST_CART_COOKIE_NAME = 'gsb_cart_guest';
const GUEST_CART_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          title: true,
          isActive: true,
          stock: true,
          finalPrice: true,
          discountPercent: true,
          wholesalePrice: true,
          wholesaleMinQty: true,
          images: {
            orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export type ResolvedCart = {
  cart: CartWithItems;
  guestTokenToSet: string | null;
};

export function guestCartCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.nodeEnv === 'production',
    maxAge: GUEST_CART_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  };
}

export async function resolveCart(request: NextRequest): Promise<ResolvedCart> {
  const user = await getSession(request);

  if (user) {
    const cart = await prisma.cart.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
      include: cartInclude,
    });
    return { cart, guestTokenToSet: null };
  }

  const guestToken = request.cookies.get(GUEST_CART_COOKIE_NAME)?.value;
  if (guestToken) {
    const cart = await prisma.cart.findUnique({ where: { guestToken }, include: cartInclude });
    if (cart) {
      return { cart, guestTokenToSet: null };
    }
  }

  const newGuestToken = randomUUID();
  const cart = await prisma.cart.create({
    data: { guestToken: newGuestToken },
    include: cartInclude,
  });
  return { cart, guestTokenToSet: newGuestToken };
}

export async function getCartById(cartId: string): Promise<CartWithItems> {
  const cart = await prisma.cart.findUniqueOrThrow({ where: { id: cartId }, include: cartInclude });
  return cart;
}

export async function mergeGuestCartIntoUserCart(
  guestToken: string,
  userId: string,
): Promise<void> {
  const guestCart = await prisma.cart.findUnique({ where: { guestToken }, include: cartInclude });

  if (!guestCart) {
    return;
  }

  if (guestCart.items.length === 0) {
    await prisma.cart.delete({ where: { id: guestCart.id } });
    return;
  }

  const memberCart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: cartInclude,
  });

  await prisma.$transaction(async (tx) => {
    for (const guestItem of guestCart.items) {
      const existing = memberCart.items.find((item) => item.productId === guestItem.productId);
      const cappedQuantity = Math.min(
        (existing?.quantity ?? 0) + guestItem.quantity,
        guestItem.product.stock,
      );

      if (cappedQuantity <= 0) {
        continue;
      }

      const unitPrice = computeUnitPrice(
        guestItem.product.finalPrice,
        cappedQuantity,
        guestItem.product.wholesalePrice,
        guestItem.product.wholesaleMinQty,
      );

      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: cappedQuantity, priceSnapshot: unitPrice },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: memberCart.id,
            productId: guestItem.productId,
            quantity: cappedQuantity,
            priceSnapshot: unitPrice,
          },
        });
      }
    }

    await tx.cart.delete({ where: { id: guestCart.id } });
  });
}

export function serializeCart(cart: CartWithItems) {
  const items = cart.items.map((item) => {
    const { product } = item;
    const expectedUnitPrice = computeUnitPrice(
      product.finalPrice,
      item.quantity,
      product.wholesalePrice,
      product.wholesaleMinQty,
    );
    const isWholesale =
      product.wholesalePrice != null &&
      product.wholesaleMinQty != null &&
      item.quantity >= product.wholesaleMinQty;
    const flag =
      !product.isActive || product.stock < item.quantity
        ? ('out_of_stock' as const)
        : expectedUnitPrice !== item.priceSnapshot
          ? ('price_changed' as const)
          : null;

    return {
      id: item.id,
      productId: item.productId,
      slug: product.slug,
      title: product.title,
      imageUrl: product.images[0]?.url ?? null,
      priceSnapshot: item.priceSnapshot,
      normalPrice: product.finalPrice,
      isWholesale,
      wholesaleMinQty: product.wholesaleMinQty,
      quantity: item.quantity,
      lineTotal: item.priceSnapshot * item.quantity,
      flag,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, subtotal, itemCount };
}
