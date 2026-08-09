import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/affiliates/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdOrderIds: string[] = [];

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

async function createAffiliate(name: string) {
  const email = `affiliate-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: 'AFFILIATE' },
  });
  const profile = await prisma.affiliateProfile.create({
    data: {
      userId: user.id,
      code: `AFF-${randomUUID()}`,
      payoutBankName: 'Bank',
      payoutBankAccount: '123',
      payoutBankHolder: name,
    },
  });
  return { user, profile };
}

function buildRequest(url: string, cookie: string) {
  return new NextRequest(url, { method: 'GET', headers: { cookie } });
}

afterAll(async () => {
  await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/affiliates', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest('http://localhost/api/admin/affiliates', ''));
    expect(response.status).toBe(401);
  });

  it('lists affiliates with click/conversion aggregates', async () => {
    const cookie = await createAdminCookie();
    const { profile } = await createAffiliate(`Searchable ${randomUUID()}`);

    await prisma.affiliateClick.create({
      data: {
        affiliateProfileId: profile.id,
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        cookieId: randomUUID(),
      },
    });

    const response = await GET(buildRequest('http://localhost/api/admin/affiliates', cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    const found = json.items.find((item: { id: string }) => item.id === profile.id);
    expect(found).toBeTruthy();
    expect(found.totalClicks).toBe(1);
  });

  it('filters by search query', async () => {
    const cookie = await createAdminCookie();
    const uniqueName = `Zebra${randomUUID()}`;
    const { profile } = await createAffiliate(uniqueName);

    const response = await GET(
      buildRequest(`http://localhost/api/admin/affiliates?q=${uniqueName}`, cookie),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].id).toBe(profile.id);
  });
});
