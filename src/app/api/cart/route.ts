import { NextRequest, NextResponse } from 'next/server';

import {
  GUEST_CART_COOKIE_NAME,
  guestCartCookieOptions,
  resolveCart,
  serializeCart,
} from '@/server/cart/cart';

export async function GET(request: NextRequest) {
  const { cart, guestTokenToSet } = await resolveCart(request);

  const response = NextResponse.json(serializeCart(cart));

  if (guestTokenToSet) {
    response.cookies.set(GUEST_CART_COOKIE_NAME, guestTokenToSet, guestCartCookieOptions());
  }

  return response;
}
