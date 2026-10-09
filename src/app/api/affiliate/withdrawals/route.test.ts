import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET, POST } from '@/app/api/affiliate/withdrawals/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProfileIds: string[] = [];
const createdOrderIds: string[] = [];

async function setup(commission: number) {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword('Password123'),
      name: 'Test',
      role: 'AFFILIATE',
    },
  });
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
  if (commission > 0) {
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-TEST-${randomUUID()}`,
        receiverName: 'Budi',
        receiverPhone: '08123456789',
        receiverEmail: 'budi@example.com',
        receiverAddress: 'Addr',
        subtotal: 10000,
        shippingCost: 0,
        discount: 0,
        total: 10000,
        paymentMethod: 'BANK_TRANSFER',
        source: 'ONLINE',
        status: 'COMPLETED',
      },
    });
    createdOrderIds.push(order.id);
    await prisma.affiliateConversion.create({
      data: {
        affiliateProfileId: profile.id,
        orderId: order.id,
        commissionAmount: commission,
        status: 'APPROVED',
      },
    });
  }
  const { token } = await createSession({ userId: user.id });
  return { cookie: `session=${token}`, profile };
}

function post(cookie: string, body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/affiliate/withdrawals', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('/api/affiliate/withdrawals', () => {
  afterAll(async () => {
    await prisma.affiliateWithdrawal.deleteMany({
      where: { affiliateProfileId: { in: createdProfileIds } },
    });
    await prisma.affiliateConversion.deleteMany({
      where: { affiliateProfileId: { in: createdProfileIds } },
    });
    await prisma.affiliateProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('rejects when earned commission is below the minimum', async () => {
    const { cookie } = await setup(40000);
    expect((await post(cookie, { amount: 50000 })).status).toBe(400);
  });

  it('rejects amounts under the minimum or above the balance', async () => {
    const { cookie } = await setup(120000);
    expect((await post(cookie, { amount: 49999 })).status).toBe(400);
    expect((await post(cookie, { amount: 120001 })).status).toBe(400);
  });

  it('creates a REQUESTED withdrawal and reduces the available balance', async () => {
    const { cookie } = await setup(120000);
    const response = await post(cookie, { amount: 70000 });
    expect(response.status).toBe(201);
    expect((await response.json()).status).toBe('REQUESTED');

    const json = await (
      await GET(
        new NextRequest('http://localhost/api/affiliate/withdrawals', { headers: { cookie } }),
      )
    ).json();
    expect(json.available).toBe(50000);
    expect(json.withdrawals).toHaveLength(1);

    // Remaining balance is exactly the minimum, so withdrawing it again works; a third does not.
    expect((await post(cookie, { amount: 50000 })).status).toBe(201);
    expect((await post(cookie, { amount: 50000 })).status).toBe(400);
  });

  it('allows only one of two concurrent requests to spend the same balance', async () => {
    const { cookie } = await setup(60000);
    const results = await Promise.all([
      post(cookie, { amount: 60000 }),
      post(cookie, { amount: 60000 }),
    ]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
  });
});
