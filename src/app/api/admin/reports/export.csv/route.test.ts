import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/reports/export.csv/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];

async function createAdminCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const admin = await prisma.user.create({
    data: { email, passwordHash, name: 'Admin', role: 'ADMIN' },
  });
  const { token } = await createSession({ userId: admin.id });
  return `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(cookie?: string, params?: Record<string, string>) {
  const url = new URL('http://localhost/api/admin/reports/export.csv');
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url, {
    method: 'GET',
    headers: cookie ? { cookie } : undefined,
  });
}

describe('GET /api/admin/reports/export.csv', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without an admin session', async () => {
    const response = await GET(buildRequest(undefined, { report: 'summary' }));
    expect(response.status).toBe(401);
  });

  it('rejects a missing report param', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest(cookie));
    expect(response.status).toBe(400);
  });

  it('rejects an invalid report value', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest(cookie, { report: 'bogus' }));
    expect(response.status).toBe(400);
  });

  const reports = [
    'summary',
    'orders-by-status',
    'top-products',
    'sales-by-day',
    'revenue-by-month',
    'revenue-by-category',
    'payment-methods',
    'pos-vs-online',
  ];

  it.each(reports)('streams a CSV for report=%s', async (report) => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest(cookie, { report, period: 'all_time' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain(`${report}.csv`);

    const body = await response.text();
    expect(body.length).toBeGreaterThan(0);
  });
});
