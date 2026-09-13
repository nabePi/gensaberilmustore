import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { DELETE, PUT } from '@/app/api/member/receivers/[id]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession, SESSION_COOKIE_NAME } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdUserIds: string[] = [];
const createdDestinationIds: string[] = [];

async function createMemberCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const user = await prisma.user.create({
    data: { email, passwordHash, name: 'Member', role: 'BUYER' },
  });
  createdUserIds.push(user.id);
  const { token } = await createSession({ userId: user.id });
  return { cookie: `${SESSION_COOKIE_NAME}=${token}`, user };
}

async function createDestination() {
  const destination = await prisma.destination.create({
    data: {
      countryName: 'INDONESIA',
      provinceName: 'Test Province',
      cityName: `Test City ${randomUUID()}`,
      districtName: 'Test District',
      subdistrictName: 'Test Subdistrict',
      zipCode: '12345',
      tariffCode: 'JKT10000',
    },
  });
  createdDestinationIds.push(destination.id);
  return destination;
}

async function createReceiver(userId: string, destinationId: string, isDefault = false) {
  return prisma.receiver.create({
    data: {
      userId,
      label: 'Rumah',
      name: 'A',
      phone: '08111',
      address: 'Addr',
      destinationId,
      isDefault,
    },
  });
}

function buildRequest(method: string, body: unknown, cookie: string) {
  return new NextRequest('http://localhost/api/member/receivers/x', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterAll(async () => {
  await prisma.receiver.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.destination.deleteMany({ where: { id: { in: createdDestinationIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('PUT /api/member/receivers/[id]', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await PUT(buildRequest('PUT', { name: 'B' }, ''), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a receiver not owned by the user', async () => {
    const { cookie } = await createMemberCookie();
    const { user: otherUser } = await createMemberCookie();
    const destination = await createDestination();
    const receiver = await createReceiver(otherUser.id, destination.id);

    const response = await PUT(buildRequest('PUT', { name: 'B' }, cookie), context(receiver.id));
    expect(response.status).toBe(404);
  });

  it('rejects an invalid payload', async () => {
    const { cookie, user } = await createMemberCookie();
    const destination = await createDestination();
    const receiver = await createReceiver(user.id, destination.id);

    const response = await PUT(buildRequest('PUT', { name: '' }, cookie), context(receiver.id));
    expect(response.status).toBe(400);
  });

  it('rejects a non-existent destination', async () => {
    const { cookie, user } = await createMemberCookie();
    const destination = await createDestination();
    const receiver = await createReceiver(user.id, destination.id);

    const response = await PUT(
      buildRequest('PUT', { destinationId: randomUUID() }, cookie),
      context(receiver.id),
    );
    expect(response.status).toBe(400);
  });

  it('partially updates a receiver', async () => {
    const { cookie, user } = await createMemberCookie();
    const destination = await createDestination();
    const receiver = await createReceiver(user.id, destination.id);

    const response = await PUT(
      buildRequest('PUT', { name: 'Updated Name' }, cookie),
      context(receiver.id),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.name).toBe('Updated Name');
    expect(json.label).toBe(receiver.label);
  });

  it('unsets other receivers as default when isDefault=true', async () => {
    const { cookie, user } = await createMemberCookie();
    const destination = await createDestination();
    const existingDefault = await createReceiver(user.id, destination.id, true);
    const receiver = await createReceiver(user.id, destination.id, false);

    const response = await PUT(
      buildRequest('PUT', { isDefault: true }, cookie),
      context(receiver.id),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.isDefault).toBe(true);

    const updatedExisting = await prisma.receiver.findUnique({
      where: { id: existingDefault.id },
    });
    expect(updatedExisting?.isDefault).toBe(false);
  });
});

describe('DELETE /api/member/receivers/[id]', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await DELETE(buildRequest('DELETE', undefined, ''), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a receiver not owned by the user', async () => {
    const { cookie } = await createMemberCookie();
    const { user: otherUser } = await createMemberCookie();
    const destination = await createDestination();
    const receiver = await createReceiver(otherUser.id, destination.id);

    const response = await DELETE(buildRequest('DELETE', undefined, cookie), context(receiver.id));
    expect(response.status).toBe(404);
  });

  it('deletes a receiver', async () => {
    const { cookie, user } = await createMemberCookie();
    const destination = await createDestination();
    const receiver = await createReceiver(user.id, destination.id);

    const response = await DELETE(buildRequest('DELETE', undefined, cookie), context(receiver.id));
    expect(response.status).toBe(204);

    const deleted = await prisma.receiver.findUnique({ where: { id: receiver.id } });
    expect(deleted).toBeNull();
  });

  it('promotes the most recently updated remaining receiver to default when the default is deleted', async () => {
    const { cookie, user } = await createMemberCookie();
    const destination = await createDestination();
    const older = await createReceiver(user.id, destination.id, false);
    const newer = await createReceiver(user.id, destination.id, false);
    const defaultReceiver = await createReceiver(user.id, destination.id, true);

    await prisma.receiver.update({ where: { id: newer.id }, data: { label: 'Kantor' } });

    const response = await DELETE(
      buildRequest('DELETE', undefined, cookie),
      context(defaultReceiver.id),
    );
    expect(response.status).toBe(204);

    const promoted = await prisma.receiver.findUnique({ where: { id: newer.id } });
    const untouched = await prisma.receiver.findUnique({ where: { id: older.id } });

    expect(promoted?.isDefault).toBe(true);
    expect(untouched?.isDefault).toBe(false);
  });
});
