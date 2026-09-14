import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/env';
import { prisma } from '@/lib/db';
import { getSession, withAuth } from '@/server/auth';
import {
  computeCartWeightKg,
  GUEST_CART_COOKIE_NAME,
  guestCartCookieOptions,
  resolveCart,
} from '@/server/cart/cart';
import { dispatchPendingNotificationsForOrder } from '@/server/notify/dispatch';
import { generateUniqueOrderNumber } from '@/server/orders/order-number';
import { createOrderSchema, listMemberOrdersQuerySchema } from '@/server/orders/schema';
import { orderListInclude, serializeOrderListItem } from '@/server/orders/serialize';
import { validateVoucherForOrder, VoucherValidationError } from '@/server/orders/voucher';
import { generateUniqueManualPaymentCode } from '@/server/payment/manual-qris';
import { computeUnitPrice, resolveActiveDiscount } from '@/server/products/pricing';
import { getShippingCost, JneTariffError } from '@/server/shipping/jne-tariff';

class OrderCreationError extends Error {}

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const user = await getSession(request);
  const { cart, guestTokenToSet } = await resolveCart(request);

  const withGuestCookie = (response: NextResponse) => {
    if (guestTokenToSet) {
      response.cookies.set(GUEST_CART_COOKIE_NAME, guestTokenToSet, guestCartCookieOptions());
    }
    return response;
  };

  if (cart.items.length === 0) {
    return withGuestCookie(NextResponse.json({ error: 'Keranjang Anda kosong' }, { status: 400 }));
  }

  try {
    let receiverName: string;
    let receiverPhone: string;
    let receiverEmail: string | null;
    let receiverAddress: string;
    let destinationId: string;

    if (data.useReceiverId) {
      if (!user) {
        throw new OrderCreationError('useReceiverId hanya berlaku untuk member yang login');
      }
      const receiver = await prisma.receiver.findUnique({ where: { id: data.useReceiverId } });
      if (!receiver || receiver.userId !== user.id) {
        throw new OrderCreationError('Alamat penerima tidak ditemukan');
      }
      const email = receiver.email ?? data.receiverEmail ?? null;
      receiverName = receiver.name;
      receiverPhone = receiver.phone;
      receiverEmail = email;
      receiverAddress = receiver.address;
      destinationId = receiver.destinationId;
    } else {
      receiverName = data.receiverName!;
      receiverPhone = data.receiverPhone!;
      receiverEmail = data.receiverEmail ?? null;
      receiverAddress = data.receiverAddress!;
      destinationId = data.destinationId!;
    }

    const destination = await prisma.destination.findUnique({ where: { id: destinationId } });
    if (!destination) {
      throw new OrderCreationError('Tujuan pengiriman tidak valid');
    }

    const weightKg = computeCartWeightKg(cart);
    let shippingCost: number;
    try {
      const tariff = await getShippingCost(destination.tariffCode, weightKg, data.service);
      shippingCost = tariff.price;
    } catch (error) {
      if (error instanceof JneTariffError) {
        throw new OrderCreationError(error.message);
      }
      throw error;
    }

    for (const item of cart.items) {
      if (!item.product.isActive || item.product.stock < item.quantity) {
        throw new OrderCreationError(`Stok produk "${item.product.title}" tidak mencukupi`);
      }
    }

    const effectiveDiscountByItemId = new Map(
      cart.items.map((item) => [
        item.id,
        item.product.isPreOrderActive
          ? { discountPercent: item.product.discountPercent, finalPrice: item.product.finalPrice }
          : resolveActiveDiscount(item.product),
      ]),
    );

    const unitPriceByItemId = new Map(
      cart.items.map((item) => [
        item.id,
        computeUnitPrice(
          effectiveDiscountByItemId.get(item.id)!.finalPrice,
          item.quantity,
          item.product.wholesalePrice,
          item.product.wholesaleMinQty,
        ),
      ]),
    );

    const subtotal = cart.items.reduce(
      (sum, item) => sum + unitPriceByItemId.get(item.id)! * item.quantity,
      0,
    );
    if (data.voucherCode) {
      try {
        await validateVoucherForOrder(prisma, data.voucherCode, {
          subtotal,
          userId: user?.id ?? null,
        });
      } catch (error) {
        if (error instanceof VoucherValidationError) {
          throw new OrderCreationError(error.message);
        }
        throw error;
      }
    }

    let affiliateUserId: string | null = null;
    let affiliateCode: string | null = null;
    if (data.affiliateCode) {
      const affiliateProfile = await prisma.affiliateProfile.findUnique({
        where: { code: data.affiliateCode },
      });
      if (affiliateProfile && affiliateProfile.isActive) {
        affiliateUserId = affiliateProfile.userId;
        affiliateCode = affiliateProfile.code;
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new OrderCreationError(`Stok produk "${item.product.title}" tidak mencukupi`);
        }
      }

      let voucherDiscount = 0;
      let lockedVoucher: { id: string; code: string } | null = null;

      if (data.voucherCode) {
        await tx.$executeRaw`SELECT id FROM "Voucher" WHERE code = ${data.voucherCode} FOR UPDATE`;

        const revalidated = await validateVoucherForOrder(tx, data.voucherCode, {
          subtotal,
          userId: user?.id ?? null,
        }).catch((error) => {
          if (error instanceof VoucherValidationError) {
            throw new OrderCreationError(error.message);
          }
          throw error;
        });

        await tx.voucher.update({
          where: { id: revalidated.voucher.id },
          data: { usedCount: { increment: 1 } },
        });

        voucherDiscount = revalidated.discountAmount;
        lockedVoucher = revalidated.voucher;
      }

      const discount = voucherDiscount;
      const total = Math.max(0, subtotal + shippingCost - discount);

      const orderNumber = await generateUniqueOrderNumber(async (candidate) =>
        Boolean(
          await tx.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } }),
        ),
      );

      const manualPaymentCode = env.midtransSnapEnabled
        ? null
        : await generateUniqueManualPaymentCode(tx);

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user?.id ?? null,
          receiverName,
          receiverPhone,
          receiverEmail,
          receiverAddress,
          destinationId: destination.id,
          receiverNote: data.note ?? null,
          shippingService: data.service,
          weightKg,
          subtotal,
          shippingCost,
          discount,
          total,
          manualPaymentCode,
          paymentMethod: manualPaymentCode !== null ? 'QRIS' : data.paymentMethod,
          source: 'ONLINE',
          affiliateUserId,
          affiliateCode,
          voucherId: lockedVoucher?.id ?? null,
          voucherCode: lockedVoucher?.code ?? null,
          voucherDiscount,
          manualDiscount: 0,
          items: {
            create: cart.items.map((item) => {
              const unitPrice = unitPriceByItemId.get(item.id)!;
              return {
                productId: item.productId,
                titleSnapshot: item.product.title,
                priceSnapshot: unitPrice,
                discountPercentSnapshot: effectiveDiscountByItemId.get(item.id)!.discountPercent,
                quantity: item.quantity,
                lineTotal: unitPrice * item.quantity,
              };
            }),
          },
          history: {
            create: {
              fromStatus: 'AWAITING_PAYMENT',
              toStatus: 'AWAITING_PAYMENT',
              note: 'Order dibuat',
            },
          },
        },
      });

      if (lockedVoucher) {
        await tx.voucherRedemption.create({
          data: {
            voucherId: lockedVoucher.id,
            orderId: createdOrder.id,
            userId: user?.id ?? null,
            discountAmount: voucherDiscount,
          },
        });
      }

      await tx.cart.delete({ where: { id: cart.id } });

      if (createdOrder.receiverEmail) {
        await tx.notification.create({
          data: {
            channel: 'EMAIL',
            recipient: createdOrder.receiverEmail,
            template: 'ORDER_CONFIRMED',
            relatedOrderId: createdOrder.id,
            relatedUserId: createdOrder.userId,
            payloadJson: {
              orderNumber: createdOrder.orderNumber,
              receiverName: createdOrder.receiverName,
              items: cart.items.map((item) => {
                const unitPrice = unitPriceByItemId.get(item.id)!;
                return {
                  title: item.product.title,
                  quantity: item.quantity,
                  unitPrice,
                  lineTotal: unitPrice * item.quantity,
                  imageUrl: item.product.images[0]?.url ?? null,
                };
              }),
              subtotal,
              shippingCost,
              discount: voucherDiscount,
              total,
            },
          },
        });
      }

      return createdOrder;
    });

    await dispatchPendingNotificationsForOrder(order.id);

    const response = NextResponse.json(
      { orderId: order.id, orderNumber: order.orderNumber },
      { status: 201 },
    );

    if (!user) {
      response.cookies.delete(GUEST_CART_COOKIE_NAME);
    }

    return response;
  } catch (error) {
    if (error instanceof OrderCreationError) {
      return withGuestCookie(NextResponse.json({ error: error.message }, { status: 400 }));
    }
    throw error;
  }
}

export const GET = withAuth(async (request: NextRequest, { user }) => {
  const parsed = listMemberOrdersQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { page, limit, status } = parsed.data;

  const where: Prisma.OrderWhereInput = {
    userId: user.id,
    ...(status ? { status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: orderListInclude,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map(serializeOrderListItem),
    total,
    page,
    limit,
  });
});
