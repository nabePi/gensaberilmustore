import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { AFFILIATE_COOKIE_NAME } from '@/server/affiliate/cookie';
import { computeAffiliateDiscount } from '@/server/affiliate/rate';
import { resolveCart } from '@/server/cart/cart';

/** Preview of the discount the current cart gets from the visitor's affiliate cookie. */
export async function GET(request: NextRequest) {
  const code = request.cookies.get(AFFILIATE_COOKIE_NAME)?.value;
  if (!code) return NextResponse.json({ discountAmount: 0 });

  const { cart } = await resolveCart(request);
  const discountAmount = await computeAffiliateDiscount(
    prisma,
    code,
    cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      lineTotal: item.priceSnapshot * item.quantity,
    })),
  );

  return NextResponse.json({ discountAmount });
}
