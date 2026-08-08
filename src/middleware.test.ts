import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { middleware } from './middleware';

import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import {
  ADMIN_SESSION_COOKIE_NAME,
  createSession,
  SESSION_COOKIE_NAME,
} from '@/server/auth/session';

const createdEmails: string[] = [];

async function createTestUser(role: 'BUYER' | 'ADMIN' = 'BUYER') {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  return prisma.user.create({ data: { email, passwordHash, name: 'Test User', role } });
}

function requestFor(path: string, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe('middleware', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('returns 401 for an admin API route without a session', async () => {
    const response = await middleware(requestFor('/api/admin/products'));
    expect(response.status).toBe(401);
  });

  it('redirects to /admin/login for an admin page without a session', async () => {
    const response = await middleware(requestFor('/admin/dashboard'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/admin/login');
  });

  it('returns 401 for a protected member API route without a session', async () => {
    const response = await middleware(requestFor('/api/member/profile'));
    expect(response.status).toBe(401);
  });

  it('redirects to /login for a member page without a session', async () => {
    const response = await middleware(requestFor('/member/profile'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login');
  });

  it('passes through an admin API route for a valid admin session', async () => {
    const admin = await createTestUser('ADMIN');
    const { token } = await createSession({ userId: admin.id });

    const response = await middleware(
      requestFor('/api/admin/products', `${ADMIN_SESSION_COOKIE_NAME}=${token}`),
    );

    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('rejects an admin API route when the session belongs to a non-admin user', async () => {
    const buyer = await createTestUser('BUYER');
    const { token } = await createSession({ userId: buyer.id });

    const response = await middleware(
      requestFor('/api/admin/products', `${ADMIN_SESSION_COOKIE_NAME}=${token}`),
    );

    expect(response.status).toBe(401);
  });

  it('passes through a protected member API route for a valid member session', async () => {
    const buyer = await createTestUser('BUYER');
    const { token } = await createSession({ userId: buyer.id });

    const response = await middleware(
      requestFor('/api/member/profile', `${SESSION_COOKIE_NAME}=${token}`),
    );

    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('passes through cart and order API routes for guests, since they manage their own auth', async () => {
    const cartResponse = await middleware(requestFor('/api/cart/items'));
    expect(cartResponse.headers.get('x-middleware-next')).toBe('1');

    const ordersResponse = await middleware(requestFor('/api/orders'));
    expect(ordersResponse.headers.get('x-middleware-next')).toBe('1');
  });

  it('passes through unrelated paths regardless of session state', async () => {
    const response = await middleware(requestFor('/'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});
