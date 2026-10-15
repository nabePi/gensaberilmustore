import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/webhooks/moota/bca', () => {
  it.each([undefined, '103.236.201.178', '203.0.113.10', '103.236.201.178, 203.0.113.10'])(
    'logs only the unchanged body regardless of sender IP (%s)',
    async (ip) => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const body = '[\n  {"type":"CR","amount":50000,"bank":{"bank_type":"bca"}}\n]';
      const request = new Request('http://localhost/api/webhooks/moota/bca', {
        method: 'POST',
        headers: ip === undefined ? {} : { 'x-forwarded-for': ip },
        body,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('');
      expect(log.mock.calls).toEqual([[body]]);
    },
  );
});
