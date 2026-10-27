import { beforeEach, describe, expect, it, vi } from 'vitest';

const { config, cancel } = vi.hoisted(() => ({
  config: { cronSecret: 'test-cron-secret' as string | undefined },
  cancel: vi.fn(),
}));
vi.mock('@/env', () => ({ env: config }));
vi.mock('@/server/orders/expire-unpaid', () => ({ cancelExpiredUnpaidOrders: cancel }));
const { POST } = await import('./route');

function request(authorization?: string) {
  return new Request('http://localhost/api/cron/expire-unpaid-orders', {
    method: 'POST',
    headers: authorization ? { Authorization: authorization } : {},
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  config.cronSecret = 'test-cron-secret';
});

describe('Unpaid order expiry endpoint', () => {
  it.each([undefined, '', '   '])('fails closed when secret is %s', async (secret) => {
    config.cronSecret = secret;
    expect((await POST(request())).status).toBe(503);
    expect(cancel).not.toHaveBeenCalled();
  });
  it.each([undefined, 'Bearer wrong', 'test-cron-secret'])(
    'rejects unauthorized requests (%s)',
    async (header) => {
      expect((await POST(request(header))).status).toBe(401);
      expect(cancel).not.toHaveBeenCalled();
    },
  );
  it('returns the cancellation summary for an authorized scheduler', async () => {
    const result = { cancelled: 2, hasMore: false, cutoffAt: '2026-10-26T00:00:00Z' };
    cancel.mockResolvedValue(result);
    const response = await POST(request('Bearer test-cron-secret'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('returns a retryable error without exposing database details', async () => {
    cancel.mockRejectedValue(new Error('private database URL'));
    const response = await POST(request('Bearer test-cron-secret'));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('private database');
  });
});
