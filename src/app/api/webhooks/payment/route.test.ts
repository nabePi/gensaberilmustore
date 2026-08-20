import { createHash, randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/webhooks/payment/route';
import { env } from '@/env';
import { prisma } from '@/lib/db';

const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];
const createdProviderEventIds: string[] = [];

async function createProduct(stock = 10) {
  const product = await prisma.product.create({
    data: {
      sku: `SKU-${randomUUID()}`,
      slug: `slug-${randomUUID()}`,
      title: `Test Product ${randomUUID()}`,
      subtitle: '',
      author: 'Test Author',
      description: 'Desc',
      price: 100000,
      finalPrice: 100000,
      discountPercent: 0,
      stock,
      weightGram: 100,
      pageCount: 100,
      coverType: 'SOFTCOVER',
      publishYear: 2024,
      isActive: true,
    },
  });
  createdProductIds.push(product.id);
  return product;
}

async function createOrder(productId: string, grossAmount: number, quantity = 1) {
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-${randomUUID()}`,
      userId: null,
      receiverName: 'Test',
      receiverPhone: '0812',
      receiverEmail: 'test@example.com',
      receiverAddress: 'Addr',
      receiverCity: 'City',
      subtotal: grossAmount,
      shippingCost: 0,
      discount: 0,
      total: grossAmount,
      paymentMethod: 'BANK_TRANSFER',
      source: 'ONLINE',
      items: {
        create: {
          productId,
          titleSnapshot: 'Test Product',
          priceSnapshot: grossAmount / quantity,
          discountPercentSnapshot: 0,
          quantity,
          lineTotal: grossAmount,
        },
      },
    },
  });
  createdOrderIds.push(order.id);
  return order;
}

function signatureFor(orderId: string, statusCode: string, grossAmount: string) {
  return createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${env.midtransServerKey ?? ''}`)
    .digest('hex');
}

function buildNotification(overrides: Record<string, unknown> = {}) {
  const transactionId = randomUUID();
  createdProviderEventIds.push(`${transactionId}:${overrides.transaction_status ?? 'settlement'}`);
  return {
    order_id: 'ORD-UNKNOWN',
    status_code: '200',
    gross_amount: '100000.00',
    transaction_status: 'settlement',
    transaction_id: transactionId,
    ...overrides,
  };
}

function buildRequest(body: unknown) {
  return new NextRequest('http://localhost/api/webhooks/payment', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/webhooks/payment', () => {
  afterAll(async () => {
    await prisma.webhookLog.deleteMany({
      where: { providerEventId: { in: createdProviderEventIds } },
    });
    await prisma.notification.deleteMany({ where: { relatedOrderId: { in: createdOrderIds } } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  });

  it('rejects an invalid payload', async () => {
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(400);
  });

  it('rejects an invalid signature', async () => {
    const notification = buildNotification({ signature_key: 'not-a-valid-signature' });
    const response = await POST(buildRequest(notification));
    expect(response.status).toBe(401);
  });

  it('acknowledges with 200 when the order cannot be found', async () => {
    const notification = buildNotification();
    const signature_key = signatureFor(
      notification.order_id,
      notification.status_code,
      notification.gross_amount,
    );
    const response = await POST(buildRequest({ ...notification, signature_key }));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true, ignored: 'order_not_found' });
  });

  it('marks the order PAID on settlement and is idempotent on repeated notifications', async () => {
    const product = await createProduct(5);
    const order = await createOrder(product.id, 100000);
    const notification = buildNotification({
      order_id: order.orderNumber,
      gross_amount: '100000.00',
      transaction_status: 'settlement',
    });
    const signature_key = signatureFor(
      notification.order_id,
      notification.status_code,
      notification.gross_amount,
    );
    const body = { ...notification, signature_key };

    const first = await POST(buildRequest(body));
    expect(first.status).toBe(200);

    const paidOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(paidOrder?.status).toBe('PAID');

    const emailNotification = await prisma.notification.findFirst({
      where: { relatedOrderId: order.id, template: 'PAYMENT_RECEIVED' },
    });
    expect(emailNotification).not.toBeNull();

    const historyCountAfterFirst = await prisma.orderStatusHistory.count({
      where: { orderId: order.id },
    });

    const second = await POST(buildRequest(body));
    expect(second.status).toBe(200);

    const historyCountAfterSecond = await prisma.orderStatusHistory.count({
      where: { orderId: order.id },
    });
    expect(historyCountAfterSecond).toBe(historyCountAfterFirst);
  });

  it('cancels the order and restores stock on expire', async () => {
    const product = await createProduct(5);
    const order = await createOrder(product.id, 100000, 2);
    const notification = buildNotification({
      order_id: order.orderNumber,
      gross_amount: '100000.00',
      transaction_status: 'expire',
    });
    const signature_key = signatureFor(
      notification.order_id,
      notification.status_code,
      notification.gross_amount,
    );

    const response = await POST(buildRequest({ ...notification, signature_key }));
    expect(response.status).toBe(200);

    const cancelledOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(cancelledOrder?.status).toBe('CANCELLED');

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct?.stock).toBe(7);
  });
});
