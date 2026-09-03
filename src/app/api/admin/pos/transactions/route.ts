import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { generateUniqueOrderNumber } from '@/server/orders/order-number';
import { orderListInclude, serializeAdminOrderListItem } from '@/server/orders/serialize';
import { validateVoucherForOrder, VoucherValidationError } from '@/server/orders/voucher';
import { createPosTransactionSchema, listPosTransactionsQuerySchema } from '@/server/pos/schema';
import { computeUnitPrice } from '@/server/products/pricing';

class PosTransactionError extends Error {}

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = createPosTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;

    try {
      const products = await prisma.product.findMany({
        where: { id: { in: data.items.map((item) => item.productId) } },
      });
      const productById = new Map(products.map((product) => [product.id, product]));

      for (const item of data.items) {
        const product = productById.get(item.productId);
        if (!product || !product.isActive) {
          throw new PosTransactionError('Produk tidak ditemukan atau tidak aktif');
        }
        if (product.stock < item.quantity) {
          throw new PosTransactionError(`Stok produk "${product.title}" tidak mencukupi`);
        }
      }

      const subtotal = data.items.reduce((sum, item) => {
        const product = productById.get(item.productId)!;
        const unitPrice = computeUnitPrice(
          product.finalPrice,
          item.quantity,
          product.wholesalePrice,
          product.wholesaleMinQty,
        );
        return sum + unitPrice * item.quantity;
      }, 0);

      if (data.voucherCode) {
        try {
          await validateVoucherForOrder(prisma, data.voucherCode, {
            subtotal,
            userId: null,
            channel: 'POS',
          });
        } catch (error) {
          if (error instanceof VoucherValidationError) {
            throw new PosTransactionError(error.message);
          }
          throw error;
        }
      }

      if (data.manualDiscount > subtotal) {
        throw new PosTransactionError('Diskon manual tidak boleh melebihi subtotal');
      }

      const order = await prisma.$transaction(async (tx) => {
        for (const item of data.items) {
          const result = await tx.product.updateMany({
            where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            const product = productById.get(item.productId)!;
            throw new PosTransactionError(`Stok produk "${product.title}" tidak mencukupi`);
          }
        }

        let voucherDiscount = 0;
        let lockedVoucher: { id: string; code: string } | null = null;

        if (data.voucherCode) {
          await tx.$executeRaw`SELECT id FROM "Voucher" WHERE code = ${data.voucherCode} FOR UPDATE`;

          const revalidated = await validateVoucherForOrder(tx, data.voucherCode, {
            subtotal,
            userId: null,
            channel: 'POS',
          }).catch((error) => {
            if (error instanceof VoucherValidationError) {
              throw new PosTransactionError(error.message);
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

        const discount = Math.min(subtotal, voucherDiscount + data.manualDiscount);
        const total = Math.max(0, subtotal - discount);

        const orderNumber = await generateUniqueOrderNumber(async (candidate) =>
          Boolean(
            await tx.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } }),
          ),
        );

        const createdOrder = await tx.order.create({
          data: {
            orderNumber,
            receiverName: data.customerName ?? 'Walk-in Customer',
            receiverPhone: data.customerPhone ?? '-',
            receiverEmail: '-',
            receiverAddress: '-',
            receiverCity: '-',
            receiverNote: data.note ?? null,
            subtotal,
            shippingCost: 0,
            discount,
            total,
            paymentMethod: data.paymentMethod,
            source: 'POS',
            status: 'PAID',
            posCashierUserId: user.id,
            voucherId: lockedVoucher?.id ?? null,
            voucherCode: lockedVoucher?.code ?? null,
            voucherDiscount,
            manualDiscount: data.manualDiscount,
            manualDiscountReason: data.manualDiscountReason ?? null,
            items: {
              create: data.items.map((item) => {
                const product = productById.get(item.productId)!;
                const unitPrice = computeUnitPrice(
                  product.finalPrice,
                  item.quantity,
                  product.wholesalePrice,
                  product.wholesaleMinQty,
                );
                return {
                  productId: product.id,
                  titleSnapshot: product.title,
                  priceSnapshot: unitPrice,
                  discountPercentSnapshot: product.discountPercent,
                  quantity: item.quantity,
                  lineTotal: unitPrice * item.quantity,
                };
              }),
            },
            history: {
              create: {
                fromStatus: 'PAID',
                toStatus: 'PAID',
                note: 'Transaksi POS dibuat',
                changedByUserId: user.id,
              },
            },
          },
        });

        if (lockedVoucher) {
          await tx.voucherRedemption.create({
            data: {
              voucherId: lockedVoucher.id,
              orderId: createdOrder.id,
              userId: null,
              discountAmount: voucherDiscount,
            },
          });
        }

        return createdOrder;
      });

      return NextResponse.json(
        { orderId: order.id, orderNumber: order.orderNumber },
        {
          status: 201,
        },
      );
    } catch (error) {
      if (error instanceof PosTransactionError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  },
  { role: 'ADMIN' },
);

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = listPosTransactionsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { page, limit, dateFrom, dateTo, cashierId } = parsed.data;

    const where: Prisma.OrderWhereInput = {
      source: 'POS',
      ...(cashierId ? { posCashierUserId: cashierId } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
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
      items: items.map(serializeAdminOrderListItem),
      total,
      page,
      limit,
    });
  },
  { role: 'ADMIN' },
);
