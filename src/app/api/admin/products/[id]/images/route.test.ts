import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/admin/products/[id]/images/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';
import { MAX_IMAGE_SIZE_BYTES } from '@/server/uploads/image';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngBytes(size = 32) {
  const bytes = new Uint8Array(size);
  bytes.set(PNG_HEADER);
  return bytes;
}

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

function buildRequest(formData: FormData, cookie: string) {
  return new NextRequest('http://localhost/api/admin/products/x/images', {
    method: 'POST',
    body: formData,
    headers: { cookie },
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/admin/products/[id]/images', () => {
  afterAll(async () => {
    await prisma.productImage.deleteMany({ where: { productId: { in: createdProductIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await Promise.all(
      createdProductIds.map((id) =>
        rm(path.join(process.cwd(), 'public', 'uploads', 'products', id), {
          recursive: true,
          force: true,
        }),
      ),
    );
  });

  it('rejects unauthenticated requests', async () => {
    const formData = new FormData();
    formData.set('image', new File([pngBytes()], 'test.png', { type: 'image/png' }));

    const response = await POST(buildRequest(formData, ''), context(randomUUID()));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a non-existent product', async () => {
    const cookie = await createAdminCookie();
    const formData = new FormData();
    formData.set('image', new File([pngBytes()], 'test.png', { type: 'image/png' }));

    const response = await POST(buildRequest(formData, cookie), context(randomUUID()));
    expect(response.status).toBe(404);
  });

  it('rejects a missing image file', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();
    const formData = new FormData();

    const response = await POST(buildRequest(formData, cookie), context(product.id));
    expect(response.status).toBe(400);
  });

  it('rejects a file larger than the size limit', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();
    const formData = new FormData();
    formData.set(
      'image',
      new File([pngBytes(MAX_IMAGE_SIZE_BYTES + 1)], 'big.png', { type: 'image/png' }),
    );

    const response = await POST(buildRequest(formData, cookie), context(product.id));
    expect(response.status).toBe(400);
  });

  it('rejects a file whose magic bytes do not match a supported image type', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();
    const formData = new FormData();
    formData.set(
      'image',
      new File([new Uint8Array([0x00, 0x01, 0x02, 0x03])], 'fake.png', { type: 'image/png' }),
    );

    const response = await POST(buildRequest(formData, cookie), context(product.id));
    expect(response.status).toBe(400);
  });

  it('uploads a valid image and marks the first image as primary', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();
    const formData = new FormData();
    formData.set('image', new File([pngBytes()], 'test.png', { type: 'image/png' }));

    const response = await POST(buildRequest(formData, cookie), context(product.id));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.isPrimary).toBe(true);
    expect(json.url).toContain(product.id);
  });

  it('does not make a second image primary unless explicitly requested', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();

    const first = new FormData();
    first.set('image', new File([pngBytes()], 'first.png', { type: 'image/png' }));
    await POST(buildRequest(first, cookie), context(product.id));

    const second = new FormData();
    second.set('image', new File([pngBytes()], 'second.png', { type: 'image/png' }));
    const response = await POST(buildRequest(second, cookie), context(product.id));
    const json = await response.json();

    expect(json.isPrimary).toBe(false);
  });

  it('unsets the previous primary when isPrimary=true is explicitly passed', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();

    const first = new FormData();
    first.set('image', new File([pngBytes()], 'first.png', { type: 'image/png' }));
    const firstResponse = await POST(buildRequest(first, cookie), context(product.id));
    const firstJson = await firstResponse.json();

    const second = new FormData();
    second.set('image', new File([pngBytes()], 'second.png', { type: 'image/png' }));
    second.set('isPrimary', 'true');
    await POST(buildRequest(second, cookie), context(product.id));

    const updatedFirst = await prisma.productImage.findUnique({ where: { id: firstJson.id } });
    expect(updatedFirst?.isPrimary).toBe(false);
  });

  it('rejects uploads once the per-product image limit is reached', async () => {
    const cookie = await createAdminCookie();
    const product = await createProduct();

    for (let i = 0; i < 8; i += 1) {
      const formData = new FormData();
      formData.set('image', new File([pngBytes()], `img${i}.png`, { type: 'image/png' }));
      const response = await POST(buildRequest(formData, cookie), context(product.id));
      expect(response.status).toBe(201);
    }

    const overLimit = new FormData();
    overLimit.set('image', new File([pngBytes()], 'over.png', { type: 'image/png' }));
    const response = await POST(buildRequest(overLimit, cookie), context(product.id));

    expect(response.status).toBe(400);
  });
});
