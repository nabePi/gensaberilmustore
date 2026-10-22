import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';
import { createSession } from '@/server/auth/session';

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock('@/server/notify/transport', () => ({ sendEmail }));
vi.mock('@/env', async (original) => {
  const actual = await original<typeof import('@/env')>();
  return {
    ...actual,
    env: { ...actual.env, jneWebhookSecret: 'jne-proof-test-secret-at-least-32-characters' },
  };
});
const { POST } = await import('@/app/api/webhooks/jne/route');
const { GET } = await import('@/app/api/orders/[id]/route');

const orderIds: string[] = [];
const userIds: string[] = [];
async function user() {
  const created = await prisma.user.create({
    data: {
      email: `jne-proof-${randomUUID()}@example.com`,
      passwordHash: 'unused-test-password',
      name: 'Buyer',
      role: 'BUYER',
    },
  });
  userIds.push(created.id);
  return created;
}
async function order() {
  const owner = await user();
  const created = await prisma.order.create({
    data: {
      orderNumber: `JNE-PROOF-${randomUUID()}`,
      userId: owner.id,
      receiverName: 'Pembeli',
      receiverPhone: '0812',
      receiverEmail: owner.email,
      receiverAddress: 'Address',
      subtotal: 100000,
      shippingCost: 10000,
      discount: 0,
      total: 110000,
      shippingMethod: 'JNE',
      airwaybillNumber: `AWB-${randomUUID()}`,
      status: 'SHIPPED',
      paymentMethod: 'BANK_TRANSFER',
      source: 'ONLINE',
    },
  });
  orderIds.push(created.id);
  return { created, owner };
}
function request(payload: unknown) {
  return new Request(
    'http://localhost/api/webhooks/jne?token=jne-proof-test-secret-at-least-32-characters',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
}
beforeEach(() => sendEmail.mockReset().mockResolvedValue({ success: true, providerId: 'test' }));
afterAll(async () => {
  await prisma.webhookLog.deleteMany({
    where: { provider: 'jne', payload: { path: ['order_id'], string_starts_with: 'JNE-PROOF-' } },
  });
  await prisma.notification.deleteMany({ where: { relatedOrderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe('JNE delivery evidence (PostgreSQL)', () => {
  it('atomically completes, stores raw payload and proof, sends one email, and exposes proof only to the member', async () => {
    const { created, owner } = await order();
    const payload = {
      order_id: created.orderNumber,
      awb: created.airwaybillNumber,
      status: 'DELIVERED',
      photo: 'https://example.com/pod.jpg',
      receiver_name: 'Ibu Siti',
      receiver_relation: 'Keluarga',
      extra_jne: { retained: true },
    };
    const responses = await Promise.all([POST(request(payload)), POST(request(payload))]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: created.id } });
    expect(saved).toMatchObject({
      status: 'COMPLETED',
      deliveryPhotoUrl: payload.photo,
      deliveryReceiverName: payload.receiver_name,
      deliveryReceiverRelation: payload.receiver_relation,
      deliveryConfirmedAt: expect.any(Date),
    });
    const logs = await prisma.webhookLog.findMany({
      where: { provider: 'jne', payload: { path: ['order_id'], equals: created.orderNumber } },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.payload).toEqual(payload);
    expect(JSON.stringify(logs)).not.toContain('jne-proof-test-secret');
    expect(
      await prisma.orderStatusHistory.count({
        where: { orderId: created.id, toStatus: 'COMPLETED' },
      }),
    ).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const html = sendEmail.mock.calls[0]![2] as string;
    for (const value of [payload.photo, payload.receiver_name, payload.receiver_relation])
      expect(html).toContain(value);
    const { token } = await createSession({ userId: owner.id });
    const response = await GET(
      new NextRequest(`http://localhost/api/orders/${created.id}`, {
        headers: { cookie: `session=${token}` },
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(response.status).toBe(200);
    expect((await response.json()).deliveryProof).toEqual({
      photoUrl: payload.photo,
      receiverName: payload.receiver_name,
      receiverRelation: payload.receiver_relation,
      confirmedAt: saved.deliveryConfirmedAt!.toISOString(),
    });
    const other = await user();
    const session = await createSession({ userId: other.id });
    const denied = await GET(
      new NextRequest(`http://localhost/api/orders/${created.id}`, {
        headers: { cookie: `session=${session.token}` },
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(denied.status).toBe(404);
  });

  it('archives other statuses without finishing orders or exposing proof early', async () => {
    const { created } = await order();
    const payload = {
      order_id: created.orderNumber,
      awb: created.airwaybillNumber,
      status: 'SHIPPED',
      photo: 'https://example.com/early.jpg',
      custom_field: 'kept',
    };
    expect((await POST(request(payload))).status).toBe(200);
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: created.id } });
    expect(saved.status).toBe('SHIPPED');
    expect(saved.deliveryPhotoUrl).toBeNull();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(
      await prisma.webhookLog.findFirst({
        where: { provider: 'jne', payload: { path: ['order_id'], equals: created.orderNumber } },
      }),
    ).toMatchObject({ payload });
  });

  it('keeps original proof on retry and fills missing fields without another email', async () => {
    const { created } = await order();
    const payload = {
      order_id: created.orderNumber,
      awb: created.airwaybillNumber,
      status: 'DELIVERED',
      receiver_name: 'Siti',
    };
    await POST(request(payload));
    await POST(
      request({
        ...payload,
        receiver_name: 'Replacement',
        photo: 'https://example.com/late.jpg',
        receiver_relation: 'Keluarga',
      }),
    );
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: created.id } });
    expect(saved.deliveryReceiverName).toBe('Siti');
    expect(saved.deliveryPhotoUrl).toBe('https://example.com/late.jpg');
    expect(saved.deliveryReceiverRelation).toBe('Keluarga');
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
