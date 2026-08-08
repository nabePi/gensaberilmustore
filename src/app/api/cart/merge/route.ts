import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import {
  getCartById,
  GUEST_CART_COOKIE_NAME,
  mergeGuestCartIntoUserCart,
  serializeCart,
} from '@/server/cart/cart';

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const guestToken = request.cookies.get(GUEST_CART_COOKIE_NAME)?.value;

  if (guestToken) {
    await mergeGuestCartIntoUserCart(guestToken, user.id);
  }

  const memberCart = await prisma.cart.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const cart = await getCartById(memberCart.id);
  const response = NextResponse.json(serializeCart(cart));

  if (guestToken) {
    response.cookies.delete(GUEST_CART_COOKIE_NAME);
  }

  return response;
});
