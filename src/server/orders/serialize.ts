import type { Prisma } from '@prisma/client';

const thumbnailImageInclude = {
  orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
  take: 1,
  select: { url: true },
} satisfies Prisma.ProductImageFindManyArgs;

export const orderListInclude = {
  items: {
    select: {
      quantity: true,
      product: { select: { images: thumbnailImageInclude } },
    },
  },
} satisfies Prisma.OrderInclude;

type OrderListItem = Prisma.OrderGetPayload<{ include: typeof orderListInclude }>;

export function serializeOrderListItem(order: OrderListItem) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const thumbnailUrl = order.items[0]?.product?.images[0]?.url ?? null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    itemCount,
    thumbnailUrl,
    createdAt: order.createdAt,
  };
}

export function serializeAdminOrderListItem(order: OrderListItem) {
  return {
    ...serializeOrderListItem(order),
    receiverName: order.receiverName,
    receiverPhone: order.receiverPhone,
    source: order.source,
    affiliateCode: order.affiliateCode,
  };
}

export const orderDetailInclude = {
  items: {
    select: {
      id: true,
      productId: true,
      titleSnapshot: true,
      priceSnapshot: true,
      discountPercentSnapshot: true,
      quantity: true,
      lineTotal: true,
      product: { select: { slug: true, images: thumbnailImageInclude } },
    },
  },
  history: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
      changedByUser: { select: { id: true, name: true } },
    },
  },
  user: { select: { id: true, name: true, email: true } },
  affiliateUser: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrderInclude;

type OrderDetail = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

export function serializeOrderDetail(order: OrderDetail) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    source: order.source,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    receiver: {
      name: order.receiverName,
      phone: order.receiverPhone,
      email: order.receiverEmail,
      address: order.receiverAddress,
      city: order.receiverCity,
      note: order.receiverNote,
    },
    pricing: {
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      voucherDiscount: order.voucherDiscount,
      manualDiscount: order.manualDiscount,
      discount: order.discount,
      total: order.total,
    },
    payment: {
      method: order.paymentMethod,
    },
    voucher: order.voucherCode
      ? { code: order.voucherCode, discount: order.voucherDiscount }
      : null,
    affiliate: order.affiliateCode
      ? {
          code: order.affiliateCode,
          user: order.affiliateUser
            ? { id: order.affiliateUser.id, name: order.affiliateUser.name }
            : null,
        }
      : null,
    member: order.user
      ? { id: order.user.id, name: order.user.name, email: order.user.email }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      title: item.titleSnapshot,
      slug: item.product?.slug ?? null,
      imageUrl: item.product?.images[0]?.url ?? null,
      priceSnapshot: item.priceSnapshot,
      discountPercentSnapshot: item.discountPercentSnapshot,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    history: order.history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      note: entry.note,
      createdAt: entry.createdAt,
      changedByUser: entry.changedByUser
        ? { id: entry.changedByUser.id, name: entry.changedByUser.name }
        : null,
    })),
  };
}
