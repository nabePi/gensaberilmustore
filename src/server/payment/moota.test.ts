import { createHmac, randomInt, randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';
import * as notifications from '@/server/notify/dispatch';
import * as orderStatus from '@/server/orders/status';

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock('@/server/notify/transport', () => ({ sendEmail }));
vi.mock('@/env', async (original) => {
  const actual = await original<typeof import('@/env')>();
  return {
    ...actual,
    env: { ...actual.env, mootaBcaWebhookSecret: 'test-bca', mootaQrisWebhookSecret: 'test-qris' },
  };
});
const { POST: bca } = await import('@/app/api/webhooks/moota/bca/route');
const { POST: qris } = await import('@/app/api/webhooks/moota/interactive-qris/route');

const bankId = randomUUID();
const orderIds: string[] = [];
type OrderOverrides = Partial<Parameters<typeof prisma.order.create>[0]['data']>;
async function order(amount: number, overrides: OrderOverrides = {}) {
  const created = await prisma.order.create({
    data: {
      orderNumber: `MOOTA-${randomUUID()}`,
      receiverName: 'Moota Test',
      receiverPhone: '0812',
      receiverEmail: 'test@example.com',
      receiverAddress: 'Test address',
      shippingMethod: 'SELF_PICKUP',
      subtotal: amount - 123,
      shippingCost: 0,
      discount: 0,
      total: amount - 123,
      manualPaymentCode: 123,
      paymentMethod: 'BANK_TRANSFER',
      source: 'ONLINE',
      status: 'AWAITING_PAYMENT',
      createdAt: new Date('2026-10-22T00:00:00Z'),
      ...overrides,
    },
  });
  orderIds.push(created.id);
  return created;
}
function mutation(amount: number, overrides: Record<string, unknown> = {}) {
  return {
    mutation_id: randomUUID(),
    bank_id: bankId,
    date: '2026-10-22 23:59:59',
    amount,
    type: 'CR',
    bank: { bank_type: 'bca' },
    ...overrides,
  };
}
function request(payload: unknown, channel: 'bca' | 'qris' = 'bca') {
  const body = JSON.stringify(payload);
  return new Request('http://localhost/api/webhooks/moota', {
    method: 'POST',
    body,
    headers: {
      Signature: createHmac('sha256', channel === 'bca' ? 'test-bca' : 'test-qris')
        .update(body)
        .digest('hex'),
    },
  });
}
async function send(payload: unknown, channel: 'bca' | 'qris' = 'bca') {
  const response = await (channel === 'bca' ? bca : qris)(request(payload, channel));
  expect(response.status).toBe(200);
  return response.json();
}
beforeEach(() => {
  sendEmail.mockReset().mockResolvedValue({ success: true, providerId: 'test-message' });
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await prisma.webhookLog.deleteMany({
    where: { provider: 'moota', payload: { path: ['mutation', 'bank_id'], equals: bankId } },
  });
  await prisma.notification.deleteMany({ where: { relatedOrderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
});

describe('Moota payment pairing (PostgreSQL)', () => {
  it('rejects a stale parallel admin transition before creating another payment notification', async () => {
    const amount = randomInt(200000, 200000000);
    const staleOrder = await order(amount);
    await prisma.order.update({ where: { id: staleOrder.id }, data: { status: 'PAID' } });
    await expect(
      prisma.$transaction((tx) =>
        orderStatus.applyOrderStatusTransition(tx, { ...staleOrder, items: [] }, 'PAID', {}),
      ),
    ).rejects.toBeInstanceOf(orderStatus.OrderStatusTransitionError);
    expect(await prisma.notification.count({ where: { relatedOrderId: staleOrder.id } })).toBe(0);
  });
  it.each(['bca', 'qris'] as const)(
    'marks the matching %s order PAID and sends the normal payment email',
    async (channel) => {
      const amount = randomInt(200000, 200000000);
      const created = await order(amount, {
        paymentMethod: channel === 'bca' ? 'BANK_TRANSFER' : 'QRIS',
      });
      const result = await send([mutation(amount)], channel);
      expect(result.results[0]).toMatchObject({ outcome: 'matched', orderId: created.id });
      expect((await prisma.order.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
        'PAID',
      );
      const email = await prisma.notification.findFirstOrThrow({
        where: { relatedOrderId: created.id },
      });
      expect(email.template).toBe('PAYMENT_RECEIVED');
      expect(email.status).toBe('SENT');
      expect(email.payloadJson).toMatchObject({ total: amount });
      expect(sendEmail).toHaveBeenCalledTimes(1);
    },
  );
  it('does not pair the base price without the unique code', async () => {
    const amount = randomInt(200000, 200000000);
    const created = await order(amount);
    const result = await send([mutation(amount - 123)]);
    expect(result.results[0].outcome).toBe('no_match');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
      'AWAITING_PAYMENT',
    );
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('also matches older manual orders without a unique code', async () => {
    const amount = randomInt(200000, 200000000);
    const created = await order(amount, { total: amount, manualPaymentCode: null });
    expect((await send([mutation(amount)])).results[0]).toMatchObject({
      outcome: 'matched',
      orderId: created.id,
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('does not settle POS orders through an online-payment webhook', async () => {
    const amount = randomInt(200000, 200000000);
    await order(amount, { source: 'POS' });
    expect((await send([mutation(amount)])).results[0].outcome).toBe('no_match');
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it.each(['PAID', 'CANCELLED', 'COMPLETED'] as const)(
    'does not change a %s order',
    async (status) => {
      const amount = randomInt(200000, 200000000);
      const created = await order(amount, { status });
      expect((await send([mutation(amount)])).results[0].outcome).toBe('no_match');
      expect((await prisma.order.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
        status,
      );
    },
  );
  it('does not guess when two pending orders have the same payable amount', async () => {
    const amount = randomInt(200000, 200000000);
    await order(amount);
    await order(amount);
    expect((await send([mutation(amount)])).results[0].outcome).toBe('ambiguous');
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('ignores debits and mutations from a different bank at the BCA endpoint', async () => {
    const amount = randomInt(200000, 200000000);
    await order(amount);
    const result = await send([
      mutation(amount, { type: 'DB' }),
      mutation(amount, { bank: { bank_type: 'bri' } }),
    ]);
    expect(result.results.map((r: { outcome: string }) => r.outcome)).toEqual([
      'ignored',
      'ignored',
    ]);
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('does not pair a bank transfer with a QRIS order or a payment predating checkout', async () => {
    const amount = randomInt(200000, 200000000);
    await order(amount, { paymentMethod: 'QRIS' });
    expect((await send([mutation(amount)])).results[0].outcome).toBe('no_match');
    const otherAmount = amount + 1000;
    await order(otherAmount, { createdAt: new Date('2026-10-23T00:00:00Z') });
    expect((await send([mutation(otherAmount)])).results[0].outcome).toBe('no_match');
  });
  it('excludes orders managed by a payment gateway', async () => {
    const amount = randomInt(200000, 200000000);
    const created = await order(amount);
    await prisma.paymentSession.create({
      data: { orderId: created.id, snapToken: 'test', snapRedirectUrl: 'https://example.com' },
    });
    expect((await send([mutation(amount)])).results[0].outcome).toBe('no_match');
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('does not reuse a mutation to pay a later order with the same amount', async () => {
    const amount = randomInt(200000, 200000000);
    await order(amount);
    const payment = mutation(amount);
    await send([payment]);
    const later = await order(amount);
    expect((await send([payment])).results[0].duplicate).toBe(true);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: later.id } })).status).toBe(
      'AWAITING_PAYMENT',
    );
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
  it('serializes concurrent deliveries of the same event and sends the email once', async () => {
    const amount = randomInt(200000, 200000000);
    const created = await order(amount);
    const payment = mutation(amount);
    await Promise.all([send([payment]), send([payment])]);
    expect(
      await prisma.orderStatusHistory.count({ where: { orderId: created.id, toStatus: 'PAID' } }),
    ).toBe(1);
    expect(await prisma.notification.count({ where: { relatedOrderId: created.id } })).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
  it('can retry post-payment effects after a committed transition without paying twice', async () => {
    const amount = randomInt(200000, 200000000);
    const created = await order(amount);
    const payment = mutation(amount);
    vi.spyOn(notifications, 'dispatchPendingNotificationsForOrder').mockRejectedValueOnce(
      new Error('Temporary failure'),
    );
    expect((await bca(request([payment]))).status).toBe(500);
    await send([payment]);
    expect(
      await prisma.orderStatusHistory.count({ where: { orderId: created.id, toStatus: 'PAID' } }),
    ).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
  it('rolls back payment and deduplication records if the transition fails', async () => {
    const amount = randomInt(200000, 200000000);
    const created = await order(amount);
    const payment = mutation(amount);
    vi.spyOn(orderStatus, 'applyOrderStatusTransition').mockImplementationOnce(
      async (tx, candidate) => {
        await tx.order.update({ where: { id: candidate.id }, data: { status: 'PAID' } });
        throw new Error('Rollback test');
      },
    );
    expect((await bca(request([payment]))).status).toBe(500);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
      'AWAITING_PAYMENT',
    );
    await send([payment]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
