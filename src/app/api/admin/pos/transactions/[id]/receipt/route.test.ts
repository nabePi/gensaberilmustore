import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/admin/pos/transactions/[id]/receipt/route';
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
  return { cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}`, adminId: admin.id };
}

async function createPosOrder(cashierId: string) {
  const order = await prisma.order.create({
    data: {
      orderNumber: `POS-${randomUUID()}`,
      receiverName: 'Walk-in Customer',
      receiverPhone: '-',
      receiverEmail: '-',
      receiverAddress: '-',
      receiverCity: '-',
      subtotal: 50000,
      shippingCost: 0,
      discount: 0,
      total: 50000,
      paymentMethod: 'POS_CASH',
      source: 'POS',
      status: 'PAID',
      posCashierUserId: cashierId,
    },
  });
  createdOrderIds.push(order.id);
  return order;
}

function buildRequest(id: string, cookie: string, print?: boolean) {
  const url = `http://localhost/api/admin/pos/transactions/${id}/receipt${print ? '?print=true' : ''}`;
  return new NextRequest(url, { method: 'GET', headers: { cookie } });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterAll(async () => {
  await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('GET /api/admin/pos/transactions/[id]/receipt', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await GET(buildRequest(randomUUID(), ''), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a non-POS order', async () => {
    const { cookie } = await createAdminCookie();
    const response = await GET(buildRequest(randomUUID(), cookie), context(randomUUID()));
    expect(response.status).toBe(404);
  });

  it('returns receipt payload for a POS order', async () => {
    const { cookie, adminId } = await createAdminCookie();
    const order = await createPosOrder(adminId);

    const response = await GET(buildRequest(order.id, cookie), context(order.id));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.order.id).toBe(order.id);
  });

  it('marks the receipt as printed when print=true', async () => {
    const { cookie, adminId } = await createAdminCookie();
    const order = await createPosOrder(adminId);

    const response = await GET(buildRequest(order.id, cookie, true), context(order.id));
    expect(response.status).toBe(200);

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.posReceiptPrintedAt).not.toBeNull();
  });
});
