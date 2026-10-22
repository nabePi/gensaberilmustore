import { createHash, createHmac, randomInt, randomUUID } from 'node:crypto';

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
  function bcaBisnisPayment(amount: number) {
    return mutation(amount, {
      date: '2026-10-18 00:00:00',
      created_at: '2026-10-19 11:37:37',
      bank: { bank_type: 'bcaGiroV2' },
    });
  }
  async function legacyBcaLog(
    payment: ReturnType<typeof mutation>,
    outcome: 'ignored' | 'no_match',
    version?: number,
  ) {
    const providerEventId = `moota:${createHash('sha256')
      .update(JSON.stringify([payment.bank_id, payment.mutation_id]))
      .digest('hex')}`;
    return prisma.webhookLog.create({
      data: {
        provider: 'moota',
        providerEventId,
        createdAt: new Date('2026-10-19T04:40:00Z'),
        processedAt: new Date('2026-10-19T04:40:00Z'),
        payload: {
          channel: 'bca',
          mutation: payment,
          result: { outcome },
          ...(version ? { matchingVersion: version } : {}),
        },
      },
    });
  }
  it('matches BCA Bisnis amount 194042 including code 42 on the original bank day', async () => {
    const created = await order(194042, {
      total: 194000,
      manualPaymentCode: 42,
      createdAt: new Date('2026-10-18T03:00:00Z'),
    });
    const payment = bcaBisnisPayment(194042);
    expect((await send([payment])).results[0]).toMatchObject({
      outcome: 'matched',
      orderId: created.id,
    });
    expect((await send([payment])).results[0]).toMatchObject({
      outcome: 'matched',
      duplicate: true,
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
  it('does not let a next-day discovery pay a next-day BCA order', async () => {
    const amount = randomInt(200000, 200000000);
    await order(amount, { createdAt: new Date('2026-10-19T00:00:00Z') });
    expect((await send([bcaBisnisPayment(amount)])).results[0].outcome).toBe('no_match');
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it.each([0, 999])('matches BCA with unique code %i', async (code) => {
    const baseTotal = randomInt(200000, 200000000);
    const created = await order(baseTotal + code, {
      total: baseTotal,
      manualPaymentCode: code,
      createdAt: new Date('2026-10-18T03:00:00Z'),
    });
    expect((await send([bcaBisnisPayment(baseTotal + code)])).results[0]).toMatchObject({
      outcome: 'matched',
      orderId: created.id,
    });
  });
  it.each([undefined, 2])('can retry a BCA Bisnis event ignored by version %s', async (version) => {
    const amount = randomInt(200000, 200000000);
    const created = await order(amount, { createdAt: new Date('2026-10-18T03:00:00Z') });
    const payment = bcaBisnisPayment(amount);
    await legacyBcaLog(payment, 'ignored', version);
    const results = await Promise.all([send([payment]), send([payment])]);
    expect(results.every((result) => result.results[0].outcome === 'matched')).toBe(true);
    expect(results.map((result) => result.results[0].duplicate).sort()).toEqual([false, true]);
    expect(
      await prisma.orderStatusHistory.count({ where: { orderId: created.id, toStatus: 'PAID' } }),
    ).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
  it('repairs a cached BCA no_match for midnight while retaining the BCA endpoint', async () => {
    const amount = randomInt(200000, 200000000);
    const created = await order(amount, { createdAt: new Date('2026-10-18T03:00:00Z') });
    const payment = { ...bcaBisnisPayment(amount), bank: { bank_type: 'bca' } };
    await legacyBcaLog(payment, 'no_match', 2);
    expect((await send([payment], 'qris')).results[0]).toMatchObject({
      outcome: 'no_match',
      duplicate: true,
    });
    expect((await send([payment])).results[0]).toMatchObject({
      outcome: 'matched',
      orderId: created.id,
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
  it('never reprocesses a BCA Bisnis debit as payment', async () => {
    const amount = randomInt(200000, 200000000);
    await order(amount, { createdAt: new Date('2026-10-18T03:00:00Z') });
    const payment = { ...bcaBisnisPayment(amount), type: 'DB' };
    await legacyBcaLog(payment, 'ignored', 2);
    expect((await send([payment])).results[0]).toMatchObject({
      outcome: 'ignored',
      duplicate: true,
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });
  function dateOnlyPayment(amount: number) {
    return mutation(amount, {
      date: '2026-10-22 00:00:00',
      created_at: '2026-10-22 12:19:21',
      bank: { bank_type: 'interactiveQris' },
    });
  }
  async function oldNoMatch(payment: ReturnType<typeof mutation>, receivedAt: Date) {
    const stored: typeof payment & { created_at?: string } = { ...payment };
    delete stored.created_at;
    const providerEventId = `moota:${createHash('sha256')
      .update(JSON.stringify([payment.bank_id, payment.mutation_id]))
      .digest('hex')}`;
    return prisma.webhookLog.create({
      data: {
        provider: 'moota',
        providerEventId,
        payload: { channel: 'interactive-qris', mutation: stored, result: { outcome: 'no_match' } },
        createdAt: receivedAt,
        processedAt: receivedAt,
      },
    });
  }
  it('matches a daytime QRIS order when the bank date has no time', async () => {
    const amount = 10445;
    const created = await order(amount, {
      paymentMethod: 'QRIS',
      createdAt: new Date('2026-10-22T04:30:00Z'),
    });
    const payment = dateOnlyPayment(amount);
    const result = await send([payment], 'qris');
    expect(result.results[0]).toMatchObject({ outcome: 'matched', orderId: created.id });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    await send([payment], 'qris');
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
  it('does not match an order created after QRIS was discovered', async () => {
    const amount = randomInt(200000, 200000000);
    await order(amount, { paymentMethod: 'QRIS', createdAt: new Date('2026-10-22T05:19:22Z') });
    expect((await send([dateOnlyPayment(amount)], 'qris')).results[0].outcome).toBe('no_match');
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it.each(['bca', 'qris'] as const)(
    'accepts a delayed %s webhook without requiring checkout near delivery time',
    async (channel) => {
      const amount = randomInt(200000, 200000000);
      const created = await order(amount, {
        paymentMethod: channel === 'bca' ? 'BANK_TRANSFER' : 'QRIS',
        createdAt: new Date('2026-10-22T04:55:00Z'),
      });
      const payment = mutation(amount, {
        date: '2026-10-22 12:00:00',
        created_at: '2026-10-22 12:19:21',
      });
      expect((await send([payment], channel)).results[0]).toMatchObject({
        outcome: 'matched',
        orderId: created.id,
      });
      expect(sendEmail).toHaveBeenCalledTimes(1);
    },
  );
  it('does not use a previous bank day to pay a next-day order', async () => {
    const amount = randomInt(200000, 200000000);
    await order(amount, { paymentMethod: 'QRIS', createdAt: new Date('2026-10-22T00:00:00Z') });
    const payment = { ...dateOnlyPayment(amount), date: '2026-10-21 00:00:00' };
    expect((await send([payment], 'qris')).results[0].outcome).toBe('no_match');
  });
  it('repairs an old cached date-only no_match once without duplicating email', async () => {
    const amount = randomInt(200000, 200000000);
    const created = await order(amount, {
      paymentMethod: 'QRIS',
      createdAt: new Date('2026-10-22T04:30:00Z'),
    });
    const payment = dateOnlyPayment(amount);
    const log = await oldNoMatch(payment, new Date('2026-10-22T05:20:00Z'));
    expect((await send([payment], 'qris')).results[0]).toMatchObject({
      outcome: 'matched',
      orderId: created.id,
      duplicate: false,
    });
    expect((await send([payment], 'qris')).results[0]).toMatchObject({
      outcome: 'matched',
      duplicate: true,
    });
    expect(await prisma.webhookLog.count({ where: { providerEventId: log.providerEventId } })).toBe(
      1,
    );
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
  it('keeps the original receipt cutoff on retry and seals the repaired no_match', async () => {
    const amount = randomInt(200000, 200000000);
    const payment = dateOnlyPayment(amount);
    await oldNoMatch(payment, new Date('2026-10-22T04:00:00Z'));
    await order(amount, { paymentMethod: 'QRIS', createdAt: new Date('2026-10-22T04:01:00Z') });
    expect((await send([payment], 'qris')).results[0]).toMatchObject({
      outcome: 'no_match',
      duplicate: false,
    });
    await order(amount, { paymentMethod: 'QRIS', createdAt: new Date('2026-10-22T03:00:00Z') });
    expect((await send([payment], 'qris')).results[0]).toMatchObject({
      outcome: 'no_match',
      duplicate: true,
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('does not let a retry change the stored amount to pay another order', async () => {
    const amount = randomInt(200000, 200000000);
    const payment = dateOnlyPayment(amount);
    await oldNoMatch(payment, new Date('2026-10-22T05:20:00Z'));
    await order(amount + 1000, { paymentMethod: 'QRIS' });
    expect((await send([{ ...payment, amount: amount + 1000 }], 'qris')).results[0]).toMatchObject({
      outcome: 'no_match',
      duplicate: true,
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });
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
