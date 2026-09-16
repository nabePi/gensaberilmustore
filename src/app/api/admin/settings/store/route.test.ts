import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, PUT } from '@/app/api/admin/settings/store/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';
import { calculateQrisCrc16 } from '@/server/payment/qris';

function buildTlv(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, '0')}${value}`;
}

function validStaticQris() {
  const withoutCrc =
    buildTlv('00', '01') +
    buildTlv('01', '11') +
    buildTlv('58', 'ID') +
    buildTlv('59', 'Toko Bahagia') +
    buildTlv('60', 'JAKARTA') +
    '6304';
  return withoutCrc + calculateQrisCrc16(withoutCrc);
}

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

function buildRequest(method: string, body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/admin/settings/store', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  });
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/settings/store', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('GET', undefined, ''));
    expect(response.status).toBe(401);
  });

  it('returns the store setting', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(buildRequest('GET', undefined, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty('setting');
  });
});

describe('PUT /api/admin/settings/store', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await PUT(buildRequest('PUT', {}, ''));
    expect(response.status).toBe(401);
  });

  it('rejects a commission percent outside 0-100', async () => {
    const cookie = await createAdminCookie();
    const response = await PUT(buildRequest('PUT', { defaultCommissionPercent: 150 }, cookie));
    expect(response.status).toBe(400);
  });

  it('rejects an invalid QRIS static code', async () => {
    const cookie = await createAdminCookie();
    const response = await PUT(
      buildRequest('PUT', { defaultCommissionPercent: 5, qrisStaticCode: 'bukan-qris' }, cookie),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.issues.qrisStaticCode[0]).toMatch(/000201/);
  });

  it('saves a valid QRIS static code and commission percent', async () => {
    const cookie = await createAdminCookie();
    const response = await PUT(
      buildRequest(
        'PUT',
        { defaultCommissionPercent: 7.5, qrisStaticCode: validStaticQris() },
        cookie,
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.setting.qrisStaticCode).toBe(validStaticQris());
    expect(Number(json.setting.defaultCommissionPercent)).toBe(7.5);
  });
});
