import { spawn } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function run(port: number, secret = 'runner-test-secret') {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done, reject) => {
    const child = spawn(process.execPath, [resolve('scripts/expire-unpaid-orders.mjs')], {
      env: { ...process.env, PORT: String(port), CRON_SECRET: secret },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => done({ code, stdout, stderr }));
  });
}

async function server(handler: (request: IncomingMessage, response: ServerResponse) => void) {
  const instance = createServer(handler);
  await new Promise<void>((resolve) => instance.listen(0, '127.0.0.1', resolve));
  return {
    port: (instance.address() as AddressInfo).port,
    close: () =>
      new Promise<void>((resolve, reject) =>
        instance.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

describe('Dokploy expiry runner', () => {
  it('authenticates against loopback, processes multiple batches and prints totals without secrets', async () => {
    const requests: { method?: string; url?: string; auth?: string }[] = [];
    const app = await server((request, response) => {
      requests.push({
        method: request.method,
        url: request.url,
        auth: request.headers.authorization,
      });
      response.setHeader('Content-Type', 'application/json');
      response.end(
        JSON.stringify(
          requests.length === 1
            ? { cancelled: 50, hasMore: true }
            : { cancelled: 2, hasMore: false },
        ),
      );
    });
    try {
      const result = await run(app.port);
      expect(result.code).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ cancelled: 52, batches: 2, hasMore: false });
      expect(requests).toEqual(
        Array(2).fill({
          method: 'POST',
          url: '/api/cron/expire-unpaid-orders',
          auth: 'Bearer runner-test-secret',
        }),
      );
      expect(result.stdout + result.stderr).not.toContain('runner-test-secret');
    } finally {
      await app.close();
    }
  });
  it('fails visibly in Dokploy logs for HTTP errors', async () => {
    const app = await server((_request, response) => {
      response.statusCode = 503;
      response.end('{}');
    });
    try {
      const result = await run(app.port);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('HTTP 503');
    } finally {
      await app.close();
    }
  });
  it('fails before making a request when CRON_SECRET is missing', async () => {
    const result = await run(1, '');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('CRON_SECRET belum dikonfigurasi');
  });
});
