import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/auth/register/route';
import { prisma } from '@/lib/db';

const createdEmails: string[] = [];

function uniqueEmail() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  return email;
}

function buildRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const validPayload = () => ({
  name: 'Budi Santoso',
  email: uniqueEmail(),
  whatsappNumber: '081234567890',
  password: 'Password123',
  confirmPassword: 'Password123',
});

describe('POST /api/auth/register', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('registers a new member with valid input', async () => {
    const payload = validPayload();

    const response = await POST(buildRequest(payload));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.user.email).toBe(payload.email);
    expect(json.user.name).toBe(payload.name);
    expect(typeof json.token).toBe('string');
    expect(response.cookies.get('session')?.value).toBeTruthy();

    const dbUser = await prisma.user.findUnique({ where: { email: payload.email } });
    expect(dbUser?.role).toBe('BUYER');
    expect(dbUser?.passwordHash).not.toBe(payload.password);
  });

  it('rejects invalid input with 400', async () => {
    const response = await POST(
      buildRequest({
        name: 'Ab',
        email: 'not-an-email',
        whatsappNumber: '12345',
        password: 'short',
        confirmPassword: 'mismatch',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('rejects a duplicate email with 409', async () => {
    const payload = validPayload();

    const first = await POST(buildRequest(payload));
    expect(first.status).toBe(201);

    const second = await POST(buildRequest(payload));
    expect(second.status).toBe(409);
  });
});
