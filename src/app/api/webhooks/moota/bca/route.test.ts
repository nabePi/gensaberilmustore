import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/webhooks/moota/bca', () => {
  it('logs only the unchanged body from the allowed IP', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const body = '[\n  {"type":"CR","amount":50000,"bank":{"bank_type":"bca"}}\n]';
    const request = new Request('http://localhost/api/webhooks/moota/bca', {
      method: 'POST',
      headers: { 'x-forwarded-for': '103.236.201.178' },
      body,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
    expect(log.mock.calls).toEqual([[body]]);
  });

  it.each([
    undefined,
    '',
    '203.0.113.10',
    '103.236.201.178, 203.0.113.10',
    '103.236.201.178,',
    '103.236.201.178.evil',
  ])('rejects an untrusted sender (%s) without reading or logging the body', async (ip) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const request = new Request('http://localhost/api/webhooks/moota/bca', {
      method: 'POST',
      headers: ip === undefined ? {} : { 'x-forwarded-for': ip },
      body: 'untrusted body',
    });
    const readBody = vi.spyOn(request, 'text');

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe('');
    expect(readBody).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
