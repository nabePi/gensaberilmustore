import { createHmac } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { config, tx, transaction } = vi.hoisted(() => ({
  config: {
    mootaBcaWebhookSecret: 'bca-test-secret' as string | undefined,
    mootaQrisWebhookSecret: 'qris-test-secret' as string | undefined,
  },
  tx: {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    webhookLog: { findUnique: vi.fn(), create: vi.fn() },
  },
  transaction: vi.fn(),
}));
vi.mock('@/env', () => ({ env: config }));
vi.mock('@/lib/db', () => ({ prisma: { $transaction: transaction } }));
vi.mock('@/server/notify/dispatch', () => ({ dispatchPendingNotificationsForOrder: vi.fn() }));
vi.mock('@/server/orders/generate-airwaybill', () => ({ generateAirwaybillForOrder: vi.fn() }));

const { POST: bca } = await import('./route');
const { POST: qris } = await import('../interactive-qris/route');
const mutation = {
  mutation_id: 'mutation-1',
  bank_id: 'bank-1',
  date: '2026-10-22 10:00:00',
  amount: 150123,
  type: 'CR',
  bank: { bank_type: 'bca' },
};
function request(body: string, secret: string, signature?: string) {
  return new Request('https://example.com/webhook', {
    method: 'POST',
    body,
    headers: { Signature: signature ?? createHmac('sha256', secret).update(body).digest('hex') },
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  config.mootaBcaWebhookSecret = 'bca-test-secret';
  config.mootaQrisWebhookSecret = 'qris-test-secret';
  tx.webhookLog.findUnique.mockResolvedValue(null);
  tx.$queryRaw.mockResolvedValue([]);
  transaction.mockImplementation((callback) => callback(tx));
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe.each([
  ['BCA', bca, 'bca-test-secret', 'mootaBcaWebhookSecret'],
  ['QRIS', qris, 'qris-test-secret', 'mootaQrisWebhookSecret'],
] as const)('Moota %s webhook', (_name, post, secret, secretKey) => {
  it('accepts signed JSON without an IP restriction', async () => {
    const response = await post(request(JSON.stringify([mutation]), secret));
    expect(response.status).toBe(200);
    expect((await response.json()).results[0].outcome).toBe('no_match');
    expect(tx.webhookLog.create).toHaveBeenCalledTimes(1);
  });
  it('fails closed when its secret is not configured', async () => {
    config[secretKey] = undefined;
    expect((await post(request(JSON.stringify([mutation]), secret))).status).toBe(503);
    expect(transaction).not.toHaveBeenCalled();
  });
  it.each(['', 'bad-signature', '0'.repeat(64)])('rejects signature %s', async (signature) => {
    expect((await post(request(JSON.stringify([mutation]), secret, signature))).status).toBe(401);
    expect(transaction).not.toHaveBeenCalled();
  });
  it('verifies original bytes rather than re-encoded JSON', async () => {
    const signature = createHmac('sha256', secret)
      .update(JSON.stringify([mutation]))
      .digest('hex');
    expect(
      (await post(request(JSON.stringify([mutation], null, 2), secret, signature))).status,
    ).toBe(401);
    expect(transaction).not.toHaveBeenCalled();
  });
  it.each(['{', '[]', '{}', '[{}]'])('rejects invalid signed payloads (%s)', async (body) => {
    expect((await post(request(body, secret))).status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
  it('returns a retryable failure if the database fails', async () => {
    transaction.mockRejectedValueOnce(new Error('DB unavailable'));
    expect((await post(request(JSON.stringify([mutation]), secret))).status).toBe(500);
  });
});
