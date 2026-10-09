import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/affiliates/overview/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdOrderIds: string[] = [];

async function createUser(role: 'ADMIN' | 'AFFILIATE') {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  return prisma.user.create({
    data: { email, passwordHash: await hashPassword('Password123'), name: 'Test', role },
  });
}

describe('GET /api/admin/affiliates/overview', () => {
  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('requires an admin session', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/affiliates/overview'));
    expect(response.status).toBe(401);
  });

  it(
    'ranks affiliates by commission earned and caps the list at 10',
    { timeout: 60_000 },
    async () => {
      const admin = await createUser('ADMIN');
      const { token } = await createSession({ userId: admin.id });
      const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;

      // 11 affiliates, each with one completed order; commission grows with the index.
      const profileIds: string[] = [];
      for (let i = 1; i <= 11; i += 1) {
        const user = await createUser('AFFILIATE');
        const profile = await prisma.affiliateProfile.create({
          data: {
            userId: user.id,
            code: `AFF-${randomUUID()}`,
            payoutBankName: 'Bank',
            payoutBankAccount: '1',
            payoutBankHolder: 'H',
            status: 'APPROVED',
          },
        });
        profileIds.push(profile.id);
        const order = await prisma.order.create({
          data: {
            orderNumber: `ORD-TEST-${randomUUID()}`,
            receiverName: 'B',
            receiverPhone: '08123456789',
            receiverEmail: 'b@example.com',
            receiverAddress: 'A',
            subtotal: 1000,
            shippingCost: 0,
            discount: 0,
            total: 1000,
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
            // Far above any real data so these rows take the top spots.
            commissionAmount: 900_000_000 + i * 1000,
            status: 'APPROVED',
          },
        });
      }

      const response = await GET(
        new NextRequest('http://localhost/api/admin/affiliates/overview', { headers: { cookie } }),
      );
      const json = await response.json();

      expect(json.top).toHaveLength(10);
      expect(json.top[0].id).toBe(profileIds[10]);
      expect(json.top[9].id).toBe(profileIds[1]);
      expect(json.top.map((t: { id: string }) => t.id)).not.toContain(profileIds[0]);
      expect(json.summary.affiliates).toBeGreaterThanOrEqual(11);
      expect(json.summary.commissionEarned).toBeGreaterThanOrEqual(11 * 900_000_000);

      await prisma.affiliateProfile.deleteMany({ where: { id: { in: profileIds } } });
    },
  );
});
