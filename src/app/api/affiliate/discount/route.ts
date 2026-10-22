import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CHECKOUT_GROUPS } from '@/lib/checkout-groups';
import { prisma } from '@/lib/db';
import { AFFILIATE_COOKIE_NAME } from '@/server/affiliate/cookie';
import { computeAffiliateDiscount } from '@/server/affiliate/rate';
import { resolveCart } from '@/server/cart/cart';
import { CheckoutGroupError, selectCheckoutItems } from '@/server/cart/checkout';

/** Preview of the discount the current cart gets from the visitor's affiliate cookie. */
export async function GET(request: NextRequest) {
  const group = z
    .enum(CHECKOUT_GROUPS)
    .optional()
    .safeParse(request.nextUrl.searchParams.get('checkoutGroup') ?? undefined);
  if (!group.success)
    return NextResponse.json({ error: 'Kelompok checkout tidak valid' }, { status: 400 });
  const code = request.cookies.get(AFFILIATE_COOKIE_NAME)?.value;
  if (!code) return NextResponse.json({ discountAmount: 0 });

  const { cart } = await resolveCart(request);
  try {
    const items = selectCheckoutItems(cart.items, group.data);
    const discountAmount = await computeAffiliateDiscount(
      prisma,
      code,
      items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        lineTotal: item.priceSnapshot * item.quantity,
      })),
    );

    return NextResponse.json({ discountAmount });
  } catch (error) {
    if (error instanceof CheckoutGroupError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
