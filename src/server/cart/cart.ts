import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import type { NextRequest } from 'next/server';

import { env } from '@/env';
import { prisma } from '@/lib/db';
import { getSession } from '@/server/auth';

export const GUEST_CART_COOKIE_NAME = 'gsb_cart_guest';
const GUEST_CART_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          isActive: true,
          stock: true,
          finalPrice: true,
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

export function serializeCart(cart: CartWithItems) {
  const items = cart.items.map((item) => {
    const { product } = item;
    const flag =
      !product.isActive || product.stock < item.quantity
        ? ('out_of_stock' as const)
        : product.finalPrice !== item.priceSnapshot
          ? ('price_changed' as const)
          : null;

    return {
      id: item.id,
      productId: item.productId,
      title: product.title,
      imageUrl: product.images[0]?.url ?? null,
      priceSnapshot: item.priceSnapshot,
      quantity: item.quantity,
      lineTotal: item.priceSnapshot * item.quantity,
      flag,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, subtotal, itemCount };
}
