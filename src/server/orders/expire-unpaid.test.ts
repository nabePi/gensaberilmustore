import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';
import {
  cancelExpiredUnpaidOrders,
  EXPIRY_BATCH_SIZE,
  UNPAID_ORDER_EXPIRY_NOTE,
  UNPAID_ORDER_TTL_MS,
} from '@/server/orders/expire-unpaid';
import { applyOrderStatusTransition } from '@/server/orders/status';

const { saveProof, deleteProof } = vi.hoisted(() => ({
  saveProof: vi.fn(),
  deleteProof: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/server/uploads/storage', () => ({
  savePaymentProofImage: saveProof,
  deletePaymentProofImageFile: deleteProof,
}));
const { POST: claimPayment } = await import('@/app/api/orders/[id]/claim-payment/route');
const { POST: uploadProof } = await import('@/app/api/orders/[id]/payment-proof/route');

// Keep these orders separate from other integration suites' current-date data.
const now = new Date('2020-01-03T00:00:00Z');
const old = new Date(now.getTime() - UNPAID_ORDER_TTL_MS - 1);
const orderIds: string[] = [];
const productIds: string[] = [];
const userIds: string[] = [];

async function product(stock = 5) {
  const created = await prisma.product.create({
    data: {
      sku: `expiry-${randomUUID()}`,
      slug: `expiry-${randomUUID()}`,
      title: 'Expiry test book',
      subtitle: '',
      author: 'Test',
      description: 'Test',
      price: 100000,
      finalPrice: 100000,
      stock,
      weightGram: 100,
      pageCount: 100,
      coverType: 'SOFTCOVER',
      publishYear: 2020,
      isActive: true,
    },
  });
  productIds.push(created.id);
  return created;
}
async function order(overrides: Partial<Prisma.OrderCreateInput> = {}, productId?: string) {
  const created = await prisma.order.create({
    data: {
      orderNumber: `EXPIRY-${randomUUID()}`,
      receiverName: 'Buyer',
      receiverPhone: '0812',
      receiverAddress: 'Test',
      receiverEmail: 'test@example.com',
      subtotal: 200000,
      shippingCost: 0,
      discount: 0,
      total: 200000,
      paymentMethod: 'BANK_TRANSFER',
      manualPaymentCode: 123,
      source: 'ONLINE',
      status: 'AWAITING_PAYMENT',
      createdAt: old,
      ...(productId
        ? {
            items: {
              create: {
                product: { connect: { id: productId } },
                titleSnapshot: 'Book',
                priceSnapshot: 100000,
                discountPercentSnapshot: 0,
                quantity: 2,
                lineTotal: 200000,
              },
            },
          }
        : {}),
      ...overrides,
    },
  });
  orderIds.push(created.id);
  return created;
}
afterEach(async () => {
  vi.restoreAllMocks();
  saveProof.mockReset();
  deleteProof.mockClear();
  await prisma.notification.deleteMany({ where: { relatedOrderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  orderIds.length = 0;
  productIds.length = 0;
  userIds.length = 0;
});

describe('Unpaid order expiry (PostgreSQL)', () => {
  it.each([-1, 0, 1])('uses the exact 24-hour boundary (%i ms)', async (offset) => {
    const created = await order({
      createdAt: new Date(now.getTime() - UNPAID_ORDER_TTL_MS - offset),
    });
    const result = await cancelExpiredUnpaidOrders(now);
    expect(result.cancelled).toBe(offset < 0 ? 0 : 1);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
      offset < 0 ? 'AWAITING_PAYMENT' : 'CANCELLED',
    );
  });
  it('restores reserved stock once and records a system note without a human actor', async () => {
    const book = await product();
    const created = await order({}, book.id);
    expect((await cancelExpiredUnpaidOrders(now)).cancelled).toBe(1);
    expect((await cancelExpiredUnpaidOrders(now)).cancelled).toBe(0);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: book.id } })).stock).toBe(7);
    const history = await prisma.orderStatusHistory.findMany({ where: { orderId: created.id } });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      fromStatus: 'AWAITING_PAYMENT',
      toStatus: 'CANCELLED',
      changedByUserId: null,
      note: UNPAID_ORDER_EXPIRY_NOTE,
    });
    expect(await prisma.notification.count({ where: { relatedOrderId: created.id } })).toBe(0);
  });
  it.each(['PAID', 'PACKED', 'SHIPPED', 'COMPLETED', 'CANCELLED'] as const)(
    'does not cancel %s orders',
    async (status) => {
      const created = await order({ status });
      expect((await cancelExpiredUnpaidOrders(now)).cancelled).toBe(0);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
        status,
      );
    },
  );
  it('excludes POS orders and leaves cart contents alone', async () => {
    await order({ source: 'POS', paymentMethod: 'POS_GATEWAY' });
    const book = await product();
    const cart = await prisma.cart.create({
      data: {
        guestToken: randomUUID(),
        items: { create: { productId: book.id, quantity: 1, priceSnapshot: 100000 } },
      },
    });
    try {
      expect((await cancelExpiredUnpaidOrders(now)).cancelled).toBe(0);
      expect(await prisma.cartItem.count({ where: { cartId: cart.id } })).toBe(1);
      expect((await prisma.product.findUniqueOrThrow({ where: { id: book.id } })).stock).toBe(5);
    } finally {
      await prisma.cart.delete({ where: { id: cart.id } });
    }
  });
  it.each([
    { paymentClaimedAt: old },
    { paymentProofUrl: 'https://example.com/proof.jpg' },
    { paymentProofUploadedAt: old },
  ])('holds orders with payment evidence for admin review (%j)', async (data) => {
    await order(data);
    expect((await cancelExpiredUnpaidOrders(now)).cancelled).toBe(0);
  });
  it('excludes gateway sessions even if the token expiry has passed', async () => {
    await order({
      paymentSession: {
        create: { snapToken: 'test', snapRedirectUrl: 'https://example.com', expiresAt: old },
      },
    });
    expect((await cancelExpiredUnpaidOrders(now)).cancelled).toBe(0);
  });
  it('cancels both guest and member orders, including PO items', async () => {
    const member = await prisma.user.create({
      data: {
        email: `expiry-${randomUUID()}@example.com`,
        name: 'Buyer',
        passwordHash: 'unused-test',
        role: 'BUYER',
      },
    });
    userIds.push(member.id);
    const book = await product();
    await order({}, book.id);
    await order({
      user: { connect: { id: member.id } },
      items: {
        create: {
          productId: book.id,
          titleSnapshot: 'PO book',
          priceSnapshot: 100000,
          discountPercentSnapshot: 0,
          isPreOrderSnapshot: true,
          quantity: 1,
          lineTotal: 100000,
        },
      },
    });
    expect((await cancelExpiredUnpaidOrders(now)).cancelled).toBe(2);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: book.id } })).stock).toBe(8);
  });
  it('handles concurrent schedulers without double stock restoration', async () => {
    const book = await product();
    await order({}, book.id);
    const results = await Promise.all([
      cancelExpiredUnpaidOrders(now),
      cancelExpiredUnpaidOrders(now),
    ]);
    expect(results.reduce((sum, result) => sum + result.cancelled, 0)).toBe(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: book.id } })).stock).toBe(7);
  });
  it('bounds each batch and lets the next call catch up', async () => {
    for (let index = 0; index < EXPIRY_BATCH_SIZE + 1; index++) await order();
    expect(await cancelExpiredUnpaidOrders(now)).toMatchObject({
      cancelled: EXPIRY_BATCH_SIZE,
      hasMore: true,
    });
    expect(await cancelExpiredUnpaidOrders(now)).toMatchObject({ cancelled: 1, hasMore: false });
  });
  it('rolls back the status and history if stock restoration fails', async () => {
    const book = await product(2147483647);
    const created = await order({}, book.id);
    await expect(cancelExpiredUnpaidOrders(now)).rejects.toThrow();
    expect((await prisma.order.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
      'AWAITING_PAYMENT',
    );
    expect(await prisma.orderStatusHistory.count({ where: { orderId: created.id } })).toBe(0);
  });
  it('does not interfere with a payment transition already holding the order lock', async () => {
    const created = await order();
    let release!: () => void;
    let locked!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const acquired = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const payment = prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${created.id} FOR UPDATE`;
      locked();
      await gate;
      await applyOrderStatusTransition(tx, { ...created, items: [] }, 'PAID', {});
    });
    try {
      await acquired;
      expect((await cancelExpiredUnpaidOrders(now)).cancelled).toBe(0);
    } finally {
      release();
      await payment;
    }
    expect((await prisma.order.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
      'PAID',
    );
  });
  it('holds an order once a claim is saved', async () => {
    const created = await order();
    const response = await claimPayment(
      new NextRequest('http://localhost/claim', { method: 'POST' }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(response.status).toBe(200);
    expect((await cancelExpiredUnpaidOrders(now)).cancelled).toBe(0);
  });
  it('rejects a claim that read the old status before expiry committed', async () => {
    const created = await order();
    const originalFind = prisma.order.findUnique.bind(prisma.order);
    vi.spyOn(prisma.order, 'findUnique').mockImplementationOnce(
      (args) =>
        // The route only awaits the result; inject expiry between its read/write.
        (async () => {
          const snapshot = await originalFind(args);
          await cancelExpiredUnpaidOrders(now);
          return snapshot;
        })() as ReturnType<typeof originalFind>,
    );
    const response = await claimPayment(
      new NextRequest('http://localhost/claim', { method: 'POST' }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(response.status).toBe(409);
    expect((await originalFind({ where: { id: created.id } }))?.paymentClaimedAt).toBeNull();
  });
  it('rejects and cleans up a proof uploaded while expiry won the race', async () => {
    const created = await order();
    saveProof.mockImplementationOnce(async () => {
      await cancelExpiredUnpaidOrders(now);
      return '/uploads/payment-proof/expiry-test.png';
    });
    const data = new FormData();
    data.set(
      'image',
      new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'proof.png', {
        type: 'image/png',
      }),
    );
    const response = await uploadProof(
      new NextRequest('http://localhost/proof', { method: 'POST', body: data }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(response.status).toBe(409);
    expect(deleteProof).toHaveBeenCalledWith('/uploads/payment-proof/expiry-test.png');
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: created.id } })).paymentProofUrl,
    ).toBeNull();
  });
});
