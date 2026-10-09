import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { PATCH } from '@/app/api/admin/affiliates/withdrawals/[id]/route';
import { GET } from '@/app/api/admin/affiliates/withdrawals/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProfileIds: string[] = [];

async function createUser(role: 'ADMIN' | 'AFFILIATE') {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  return prisma.user.create({
    data: { email, passwordHash: await hashPassword('Password123'), name: 'Test', role },
  });
}

async function adminCookie() {
  const admin = await createUser('ADMIN');
  const { token } = await createSession({ userId: admin.id });
  return `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
}

async function createWithdrawal() {
  const user = await createUser('AFFILIATE');
  const profile = await prisma.affiliateProfile.create({
    data: {
      userId: user.id,
      code: `AFF-${randomUUID()}`,
      payoutBankName: 'BCA',
      payoutBankAccount: '123',
      payoutBankHolder: 'Holder',
      status: 'APPROVED',
    },
  });
  createdProfileIds.push(profile.id);
  return prisma.affiliateWithdrawal.create({
    data: {
      affiliateProfileId: profile.id,
      amount: 60000,
      bankName: 'BCA',
      bankAccount: '123',
      bankHolder: 'Holder',
    },
  });
}

function patch(id: string, cookie: string | undefined, status: string) {
  return PATCH(
    new NextRequest(`http://localhost/api/admin/affiliates/withdrawals/${id}`, {
      method: 'PATCH',
      headers: { ...(cookie ? { cookie } : {}), 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe('admin affiliate withdrawals', () => {
  afterAll(async () => {
    await prisma.affiliateWithdrawal.deleteMany({
      where: { affiliateProfileId: { in: createdProfileIds } },
    });
    await prisma.affiliateProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('requires an admin session', async () => {
    const withdrawal = await createWithdrawal();
    expect((await patch(withdrawal.id, undefined, 'IN_PROGRESS')).status).toBe(401);
    const list = await GET(new NextRequest('http://localhost/api/admin/affiliates/withdrawals'));
    expect(list.status).toBe(401);
  });

  it('moves REQUESTED → IN_PROGRESS → COMPLETED and stamps completedAt', async () => {
    const cookie = await adminCookie();
    const withdrawal = await createWithdrawal();

    // Cannot skip IN_PROGRESS.
    expect((await patch(withdrawal.id, cookie, 'COMPLETED')).status).toBe(400);

    const inProgress = await patch(withdrawal.id, cookie, 'IN_PROGRESS');
    expect(inProgress.status).toBe(200);
    expect((await inProgress.json()).completedAt).toBeNull();

    const completed = await patch(withdrawal.id, cookie, 'COMPLETED');
    expect(completed.status).toBe(200);
    const json = await completed.json();
    expect(json.status).toBe('COMPLETED');
    expect(json.completedAt).not.toBeNull();

    // Terminal state.
    expect((await patch(withdrawal.id, cookie, 'IN_PROGRESS')).status).toBe(400);
  });

  it('lists withdrawals with affiliate and bank details', async () => {
    const cookie = await adminCookie();
    const withdrawal = await createWithdrawal();
    const response = await GET(
      new NextRequest('http://localhost/api/admin/affiliates/withdrawals?status=REQUESTED', {
        headers: { cookie },
      }),
    );
    const json = await response.json();
    const row = json.items.find((i: { id: string }) => i.id === withdrawal.id);
    expect(row.bank.account).toBe('123');
    expect(row.affiliate.code).toBeTruthy();
  });
});
