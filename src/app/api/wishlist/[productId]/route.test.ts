import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { DELETE } from '@/app/api/wishlist/[productId]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession, SESSION_COOKIE_NAME } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdUserIds: string[] = [];
const createdProductIds: string[] = [];

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

async function createProduct() {
  const product = await prisma.product.create({
    data: {
      sku: `SKU-${randomUUID()}`,
      slug: `slug-${randomUUID()}`,
      title: `Test Product ${randomUUID()}`,
      subtitle: '',
      author: 'Test Author',
      imprint: 'Test Publisher',
      description: 'Desc',
      price: 100000,
      finalPrice: 100000,
      stock: 10,
      weightGram: 100,
      pageCount: 100,
      coverType: 'SOFTCOVER',
      publishYear: 2024,
      isActive: true,
    },
  });
  createdProductIds.push(product.id);
  return product;
}

function buildRequest(productId: string, cookie: string) {
  return new NextRequest(`http://localhost/api/wishlist/${productId}`, {
    method: 'DELETE',
    headers: cookie ? { cookie } : {},
  });
}

function buildContext(productId: string) {
  return { params: Promise.resolve({ productId }) };
}

afterAll(async () => {
  await prisma.wishlistItem.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('DELETE /api/wishlist/[productId]', () => {
  it('rejects unauthenticated requests', async () => {
    const productId = randomUUID();
    const response = await DELETE(buildRequest(productId, ''), buildContext(productId));
    expect(response.status).toBe(401);
  });

  it('returns 404 when the wishlist item does not exist', async () => {
    const { cookie } = await createMemberCookie();
    const productId = randomUUID();
    const response = await DELETE(buildRequest(productId, cookie), buildContext(productId));
    expect(response.status).toBe(404);
  });

  it('removes the wishlist item', async () => {
    const { cookie, user } = await createMemberCookie();
    const product = await createProduct();
    await prisma.wishlistItem.create({ data: { userId: user.id, productId: product.id } });

    const response = await DELETE(buildRequest(product.id, cookie), buildContext(product.id));
    expect(response.status).toBe(204);

    const item = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: user.id, productId: product.id } },
    });
    expect(item).toBeNull();
  });

  it('only removes the wishlist item belonging to the authenticated user', async () => {
    const { cookie } = await createMemberCookie();
    const { user: otherUser } = await createMemberCookie();
    const product = await createProduct();
    await prisma.wishlistItem.create({ data: { userId: otherUser.id, productId: product.id } });

    const response = await DELETE(buildRequest(product.id, cookie), buildContext(product.id));
    expect(response.status).toBe(404);

    const item = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: otherUser.id, productId: product.id } },
    });
    expect(item).not.toBeNull();
  });
});
