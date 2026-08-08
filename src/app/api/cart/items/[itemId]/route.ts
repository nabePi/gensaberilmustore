import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import {
  getCartById,
  GUEST_CART_COOKIE_NAME,
  guestCartCookieOptions,
  resolveCart,
  serializeCart,
} from '@/server/cart/cart';
import { updateCartItemQuantitySchema } from '@/server/cart/schema';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;

  const body: unknown = await request.json().catch(() => null);
  const parsed = updateCartItemQuantitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { cart, guestTokenToSet } = await resolveCart(request);

  const withGuestCookie = (response: NextResponse) => {
    if (guestTokenToSet) {
      response.cookies.set(GUEST_CART_COOKIE_NAME, guestTokenToSet, guestCartCookieOptions());
    }
    return response;
  };

  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { product: { select: { stock: true } } },
  });

  if (!item || item.cartId !== cart.id) {
    return withGuestCookie(
      NextResponse.json({ error: 'Item keranjang tidak ditemukan' }, { status: 404 }),
    );
  }

  if (item.product.stock < parsed.data.quantity) {
    return withGuestCookie(
      NextResponse.json(
        { error: 'Validasi gagal', issues: { quantity: ['Stok tidak mencukupi'] } },
        { status: 400 },
      ),
    );
  }

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: parsed.data.quantity } });

  const updatedCart = await getCartById(cart.id);
  return withGuestCookie(NextResponse.json(serializeCart(updatedCart)));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;

  const { cart, guestTokenToSet } = await resolveCart(request);

  const withGuestCookie = (response: NextResponse) => {
    if (guestTokenToSet) {
      response.cookies.set(GUEST_CART_COOKIE_NAME, guestTokenToSet, guestCartCookieOptions());
    }
    return response;
  };

  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });

  if (!item || item.cartId !== cart.id) {
    return withGuestCookie(
      NextResponse.json({ error: 'Item keranjang tidak ditemukan' }, { status: 404 }),
    );
  }

  await prisma.cartItem.delete({ where: { id: itemId } });

  const updatedCart = await getCartById(cart.id);
  return withGuestCookie(NextResponse.json(serializeCart(updatedCart)));
}
