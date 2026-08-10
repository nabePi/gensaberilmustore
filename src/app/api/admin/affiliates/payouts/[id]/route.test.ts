import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { PATCH } from '@/app/api/admin/affiliates/payouts/[id]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdUserIds: string[] = [];
const createdAffiliateProfileIds: string[] = [];
const createdPayoutIds: string[] = [];

async function createTestUser(role: 'BUYER' | 'ADMIN' | 'AFFILIATE' = 'BUYER', phone?: string) {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const user = await prisma.user.create({
    data: { email, passwordHash, name: 'Test User', role, phone },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createAdminCookie() {
  const admin = await createTestUser('ADMIN');
  const { token } = await createSession({ userId: admin.id });
  return `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
}

async function createAffiliateProfile(phone?: string) {
  const user = await createTestUser('AFFILIATE', phone);
  const profile = await prisma.affiliateProfile.create({
    data: {
      userId: user.id,
      code: `AFF-${randomUUID()}`,
      payoutBankName: 'Bank',
      payoutBankAccount: '123',
      payoutBankHolder: 'Holder',
    },
  });
  createdAffiliateProfileIds.push(profile.id);
  return profile;
}

async function createPayout(
  affiliateProfileId: string,
  status: 'PENDING' | 'PAID' | 'CANCELLED' = 'PENDING',
) {
  const payout = await prisma.affiliatePayout.create({
    data: {
      affiliateProfileId,
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      totalAmount: 15000,
      status,
    },
  });
  createdPayoutIds.push(payout.id);
  return payout;
}

function buildRequest(cookie?: string) {
  return new NextRequest('http://localhost/api/admin/affiliates/payouts/x', {
    method: 'PATCH',
    headers: cookie ? { cookie } : undefined,
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/admin/affiliates/payouts/[id]', () => {
  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { relatedUserId: { in: createdUserIds } } });
    await prisma.affiliatePayout.deleteMany({ where: { id: { in: createdPayoutIds } } });
    await prisma.affiliateProfile.deleteMany({ where: { id: { in: createdAffiliateProfileIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 without an admin session', async () => {
    const response = await PATCH(buildRequest(), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a non-existent payout', async () => {
    const cookie = await createAdminCookie();
    const response = await PATCH(buildRequest(cookie), context(randomUUID()));
    expect(response.status).toBe(404);
  });

  it('rejects marking a non-pending payout as paid', async () => {
    const cookie = await createAdminCookie();
    const profile = await createAffiliateProfile();
    const payout = await createPayout(profile.id, 'PAID');

    const response = await PATCH(buildRequest(cookie), context(payout.id));
    expect(response.status).toBe(400);
  });

  it('marks a pending payout as paid and notifies the affiliate by email and whatsapp', async () => {
    const cookie = await createAdminCookie();
    const profile = await createAffiliateProfile('08129999999');
    const payout = await createPayout(profile.id, 'PENDING');

    const response = await PATCH(buildRequest(cookie), context(payout.id));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('PAID');
    expect(json.paidAt).not.toBeNull();

    const notifications = await prisma.notification.findMany({
      where: { relatedUserId: profile.userId },
    });
    expect(notifications).toHaveLength(2);
    expect(notifications.map((n) => n.channel).sort()).toEqual(['EMAIL', 'WHATSAPP']);
    expect(notifications.every((n) => n.template === 'AFFILIATE_PAYOUT')).toBe(true);
  });
});
