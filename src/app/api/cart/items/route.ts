import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import {
  getCartById,
  GUEST_CART_COOKIE_NAME,
  guestCartCookieOptions,
  resolveCart,
  serializeCart,
} from '@/server/cart/cart';
import { addCartItemSchema } from '@/server/cart/schema';

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = addCartItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { productId, quantity } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) {
    return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
  }

  const { cart, guestTokenToSet } = await resolveCart(request);

  const withGuestCookie = (response: NextResponse) => {
    if (guestTokenToSet) {
      response.cookies.set(GUEST_CART_COOKIE_NAME, guestTokenToSet, guestCartCookieOptions());
    }
    return response;
  };

  const existingItem = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
  const newQuantity = (existingItem?.quantity ?? 0) + quantity;

  if (product.stock < newQuantity) {
    return withGuestCookie(
      NextResponse.json(
        { error: 'Validasi gagal', issues: { quantity: ['Stok tidak mencukupi'] } },
        { status: 400 },
      ),
    );
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { quantity: newQuantity },
    create: {
      cartId: cart.id,
      productId,
      quantity: newQuantity,
      priceSnapshot: product.finalPrice,
    },
  });

  const updatedCart = await getCartById(cart.id);
  return withGuestCookie(NextResponse.json(serializeCart(updatedCart), { status: 201 }));
}
