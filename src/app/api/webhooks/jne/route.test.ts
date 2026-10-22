import { beforeEach, describe, expect, it, vi } from 'vitest';

const { tx, transaction, dispatch, config } = vi.hoisted(() => {
  const tx = {
    $executeRaw: vi.fn(),
    order: { findUnique: vi.fn(), update: vi.fn() },
    orderStatusHistory: { create: vi.fn() },
    notification: { create: vi.fn() },
    affiliateConversion: { findUnique: vi.fn(), update: vi.fn() },
  };
  return {
    tx,
    transaction: vi.fn(),
    dispatch: vi.fn(),
    config: { jneWebhookSecret: 'test-secret-for-jne-webhook-32-characters' as string | undefined },
  };
});

vi.mock('@/env', () => ({ env: config }));
vi.mock('@/lib/db', () => ({ prisma: { $transaction: transaction } }));
vi.mock('@/server/notify/dispatch', () => ({ dispatchPendingNotificationsForOrder: dispatch }));

const { POST } = await import('./route');

const order = {
  id: 'order-id',
  orderNumber: 'ORD-JNE-1',
  shippingMethod: 'JNE',
  airwaybillNumber: 'JNE123456',
  status: 'SHIPPED',
  receiverName: 'Buyer',
  receiverEmail: 'buyer@example.com',
  total: 100000,
  userId: null,
  items: [],
};
const payload = { awb: order.airwaybillNumber, order_id: order.orderNumber, status: 'DELIVERED' };

function request(body: unknown = payload, token: string | null = config.jneWebhookSecret ?? null) {
  const url = new URL('http://localhost/api/webhooks/jne');
  if (token !== null) url.searchParams.set('token', token);
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  config.jneWebhookSecret = 'test-secret-for-jne-webhook-32-characters';
  transaction.mockImplementation((callback) => callback(tx));
  tx.order.findUnique.mockResolvedValue({ ...order });
  tx.order.update.mockResolvedValue({ ...order, status: 'COMPLETED' });
  tx.affiliateConversion.findUnique.mockResolvedValue({ id: 'conversion-id', status: 'PENDING' });
});

describe('POST /api/webhooks/jne', () => {
  it('completes a delivered order with history, notification and affiliate approval', async () => {
    const response = await POST(request({ ...payload, signature: 'https://example.com/proof' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: true });
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.order.findUnique.mock.invocationCallOrder[0]!,
    );
    expect(tx.order.findUnique).toHaveBeenCalledWith({
      where: { orderNumber: payload.order_id },
      include: { items: true },
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: order.id, status: 'SHIPPED' },
      data: { status: 'COMPLETED' },
    });
    expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: order.id,
        fromStatus: 'SHIPPED',
        toStatus: 'COMPLETED',
        changedByUserId: null,
      }),
    });
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ template: 'ORDER_COMPLETED', relatedOrderId: order.id }),
    });
    expect(tx.affiliateConversion.update).toHaveBeenCalledWith({
      where: { id: 'conversion-id' },
      data: { status: 'APPROVED', approvedAt: expect.any(Date) },
    });
    expect(dispatch).toHaveBeenCalledWith(order.id);
  });

  it('acknowledges repeated delivery without duplicating completion side effects', async () => {
    await POST(request());
    tx.order.findUnique.mockResolvedValue({ ...order, status: 'COMPLETED' });
    const repeated = await POST(request());

    expect(await repeated.json()).toEqual({ status: true });
    expect(tx.order.update).toHaveBeenCalledTimes(1);
    expect(tx.orderStatusHistory.create).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    expect(tx.affiliateConversion.update).toHaveBeenCalledTimes(1);
  });

  it.each(['SUCCESS PICKUP', 'FAILED PICKUP', 'SHIPPED', 'SHIPMENT PROBLEM', 'RETURN TO SHIPPER'])(
    'acknowledges %s without changing order data',
    async (status) => {
      const response = await POST(request({ ...payload, status }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: true });
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it.each([null, 'wrong-token', 'x'.repeat(38)])('rejects an invalid token (%s)', async (token) => {
    const req = request(payload, token);
    const read = vi.spyOn(req, 'json');
    const response = await POST(req);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ status: false, reason: 'Unauthorized' });
    expect(read).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('fails closed when the webhook secret is not configured', async () => {
    config.jneWebhookSecret = undefined;
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([
    null,
    [],
    {},
    { ...payload, awb: '' },
    { ...payload, order_id: '' },
    { ...payload, status: 'UNKNOWN' },
  ])('rejects invalid payloads (%j)', async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect((await response.json()).status).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON', async () => {
    const req = request();
    vi.spyOn(req, 'json').mockRejectedValue(new SyntaxError('Invalid JSON'));
    expect((await POST(req)).status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { ...order, airwaybillNumber: 'OTHER' },
    { ...order, shippingMethod: 'SELF_PICKUP' },
  ])('rejects an unknown or mismatched JNE shipment', async (match) => {
    tx.order.findUnique.mockResolvedValue(match);
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each(['AWAITING_PAYMENT', 'PAID', 'PACKED', 'CANCELLED'])(
    'does not complete an order with status %s',
    async (status) => {
      tx.order.findUnique.mockResolvedValue({ ...order, status });
      expect((await POST(request())).status).toBe(409);
      expect(tx.order.update).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it('returns a retryable failure when the transaction fails', async () => {
    transaction.mockRejectedValue(new Error('Database unavailable'));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      status: false,
      reason: 'Gagal memproses webhook JNE, silakan coba lagi',
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('allows a retry to dispatch pending notifications after completion was committed', async () => {
    dispatch.mockRejectedValueOnce(new Error('Notification unavailable'));
    expect((await POST(request())).status).toBe(500);
    tx.order.findUnique.mockResolvedValue({ ...order, status: 'COMPLETED' });
    expect((await POST(request())).status).toBe(200);
    expect(tx.order.update).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
});
