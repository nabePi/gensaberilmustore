import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { PATCH } from '@/app/api/admin/affiliates/[id]/route';
import { GET } from '@/app/api/admin/affiliates/members/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];

async function createAdminCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const admin = await prisma.user.create({
    data: { email, passwordHash: await hashPassword('Password123'), name: 'Admin', role: 'ADMIN' },
  });
  const { token } = await createSession({ userId: admin.id });
  return `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
}

async function createAffiliate(name: string) {
  const email = `affiliate-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword('Password123'), name, role: 'AFFILIATE' },
  });
  return prisma.affiliateProfile.create({
    data: {
      userId: user.id,
      code: `AFF-${randomUUID()}`,
      payoutBankName: 'Bank',
      payoutBankAccount: '123',
      payoutBankHolder: name,
    },
  });
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('admin affiliate members', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/affiliates/members'));
    expect(response.status).toBe(401);
  });

  it('rejects unsupported page sizes', async () => {
    const cookie = await createAdminCookie();
    const response = await GET(
      new NextRequest('http://localhost/api/admin/affiliates/members?limit=20', {
        headers: { cookie },
      }),
    );
    expect(response.status).toBe(400);
  });

  it('searches, filters by status, and approves/deactivates', async () => {
    const cookie = await createAdminCookie();
    const marker = `Zed${randomUUID().slice(0, 8)}`;
    const profile = await createAffiliate(marker);

    const list = await GET(
      new NextRequest(`http://localhost/api/admin/affiliates/members?q=${marker}&status=PENDING`, {
        headers: { cookie },
      }),
    );
    const body = await list.json();
    expect(body.limit).toBe(10);
    expect(body.items.map((i: { id: string }) => i.id)).toEqual([profile.id]);

    const approve = await PATCH(
      new NextRequest('http://localhost/x', {
        method: 'PATCH',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED', isActive: false }),
      }),
      { params: Promise.resolve({ id: profile.id }) },
    );
    expect(approve.status).toBe(200);
    expect(await approve.json()).toMatchObject({ status: 'APPROVED', isActive: false });

    const filtered = await GET(
      new NextRequest(
        `http://localhost/api/admin/affiliates/members?q=${marker}&status=APPROVED&active=false`,
        { headers: { cookie } },
      ),
    );
    expect((await filtered.json()).total).toBe(1);
  });
});
