import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { DELETE } from '@/app/api/admin/products/[id]/images/[imageId]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];

async function createAdminCookie() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const admin = await prisma.user.create({
    data: { email, passwordHash, name: 'Admin', role: 'ADMIN' },
  });
  const { token } = await createSession({ userId: admin.id });
  return `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
}

async function createProduct() {
  const product = await prisma.product.create({
    data: {
      sku: `SKU-${randomUUID()}`,
      slug: `slug-${randomUUID()}`,
      title: `Test Product ${randomUUID()}`,
      subtitle: '',
      author: 'Test Author',
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

async function createImage(
  productId: string,
  overrides: { position?: number; isPrimary?: boolean } = {},
) {
  return prisma.productImage.create({
    data: {
      productId,
      url: `/uploads/products/${productId}/${randomUUID()}.png`,
      position: 0,
      isPrimary: false,
      ...overrides,
    },
  });
}

function buildRequest(cookie: string) {
  return new NextRequest('http://localhost/api/admin/products/x/images/y', {
    method: 'DELETE',
    headers: { cookie },
  });
}

function context(id: string, imageId: string) {
  return { params: Promise.resolve({ id, imageId }) };
}

describe('DELETE /api/admin/products/[id]/images/[imageId]', () => {
  afterAll(async () => {
    await prisma.productImage.deleteMany({ where: { productId: { in: createdProductIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('rejects unauthenticated requests', async () => {
    const response = await DELETE(buildRequest(''), context(randomUUID(), randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 when the image does not exist', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();

    const response = await DELETE(buildRequest(cookie), context(product.id, randomUUID()));
    expect(response.status).toBe(404);
  });

  it('returns 404 when the image belongs to a different product', async () => {
    const cookie = await createAdminCookie();
    const productA = await createProduct();
    const productB = await createProduct();
    const image = await createImage(productA.id);

    const response = await DELETE(buildRequest(cookie), context(productB.id, image.id));
    expect(response.status).toBe(404);
  });

  it('deletes a non-primary image successfully', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();
    const image = await createImage(product.id);

    const response = await DELETE(buildRequest(cookie), context(product.id, image.id));
    expect(response.status).toBe(204);

    const found = await prisma.productImage.findUnique({ where: { id: image.id } });
    expect(found).toBeNull();
  });

  it('reassigns primary to the next-lowest-position image when the primary is deleted', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();
    const primary = await createImage(product.id, { position: 0, isPrimary: true });
    const next = await createImage(product.id, { position: 1, isPrimary: false });

    const response = await DELETE(buildRequest(cookie), context(product.id, primary.id));
    expect(response.status).toBe(204);

    const updatedNext = await prisma.productImage.findUnique({ where: { id: next.id } });
    expect(updatedNext?.isPrimary).toBe(true);
  });
});
