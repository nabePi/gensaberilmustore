import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, POST } from '@/app/api/admin/vouchers/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdVoucherIds: string[] = [];

async function createAdminCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const admin = await prisma.user.create({
    data: { email, passwordHash, name: 'Admin', role: 'ADMIN' },
  });
  const { token } = await createSession({ userId: admin.id });
  return { cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}`, adminId: admin.id };
}

function buildRequest(method: string, body: unknown, cookie: string, url?: string) {
  return new NextRequest(url ?? 'http://localhost/api/admin/vouchers', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

function validPayload() {
  return {
    code: `TEST${randomUUID().slice(0, 8)}`,
    description: 'Voucher uji coba',
    type: 'PERCENT' as const,
    value: 10,
    maxDiscount: 20000,
    minPurchase: 50000,
    channel: 'ALL' as const,
    quota: 100,
    perUserLimit: 1,
    isActive: true,
  };
}

afterAll(async () => {
  await prisma.voucher.deleteMany({ where: { id: { in: createdVoucherIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/vouchers', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''));
    expect(response.status).toBe(401);
  });

  it('returns a paginated list of vouchers', async () => {
    const { cookie, adminId } = await createAdminCookie();
    const voucher = await prisma.voucher.create({
      data: { ...validPayload(), createdByUserId: adminId },
    });
    createdVoucherIds.push(voucher.id);

    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(typeof json.total).toBe('number');
    expect(Array.isArray(json.items)).toBe(true);
  });
});

describe('POST /api/admin/vouchers', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await POST(buildRequest('POST', validPayload(), ''));
    expect(response.status).toBe(401);
  });

  it('rejects maxDiscount on a FIXED voucher', async () => {
    const { cookie } = await createAdminCookie();
    const response = await POST(
      buildRequest('POST', { ...validPayload(), type: 'FIXED', value: 5000 }, cookie),
    );
    expect(response.status).toBe(400);
  });

  it('rejects PERCENT value above 100', async () => {
    const { cookie } = await createAdminCookie();
    const response = await POST(buildRequest('POST', { ...validPayload(), value: 150 }, cookie));
    expect(response.status).toBe(400);
  });

  it('creates a voucher', async () => {
    const { cookie } = await createAdminCookie();
    const response = await POST(buildRequest('POST', validPayload(), cookie));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.type).toBe('PERCENT');
    createdVoucherIds.push(json.id);
  });

  it('rejects a duplicate code', async () => {
    const { cookie } = await createAdminCookie();
    const payload = validPayload();
    const first = await POST(buildRequest('POST', payload, cookie));
    const firstJson = await first.json();
    createdVoucherIds.push(firstJson.id);

    const second = await POST(buildRequest('POST', payload, cookie));
    expect(second.status).toBe(409);
  });
});
