import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/admin/uploads/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { ADMIN_SESSION_COOKIE_NAME, createSession } from '@/server/auth/session';
import { MAX_IMAGE_SIZE_BYTES } from '@/server/uploads/image';

const createdEmails: string[] = [];

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

function buildRequest(formData: FormData, cookie: string) {
  return new NextRequest('http://localhost/api/admin/uploads', {
    method: 'POST',
    body: formData,
    headers: { cookie },
  });
}

describe('POST /api/admin/uploads', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await rm(path.join(process.cwd(), 'public', 'uploads', 'misc'), {
      recursive: true,
      force: true,
    });
  });

  it('rejects unauthenticated requests', async () => {
    const formData = new FormData();
    formData.set('image', new File([pngBytes()], 'test.png', { type: 'image/png' }));

    const response = await POST(buildRequest(formData, ''));
    expect(response.status).toBe(401);
  });

  it('rejects a missing image file', async () => {
    const cookie = await createAdminCookie();
    const formData = new FormData();

    const response = await POST(buildRequest(formData, cookie));
    expect(response.status).toBe(400);
  });

  it('rejects a file larger than the size limit', async () => {
    const cookie = await createAdminCookie();
    const formData = new FormData();
    formData.set(
      'image',
      new File([pngBytes(MAX_IMAGE_SIZE_BYTES + 1)], 'big.png', { type: 'image/png' }),
    );

    const response = await POST(buildRequest(formData, cookie));
    expect(response.status).toBe(400);
  });

  it('rejects a file whose magic bytes do not match a supported image type', async () => {
    const cookie = await createAdminCookie();
    const formData = new FormData();
    formData.set(
      'image',
      new File([new Uint8Array([0x00, 0x01, 0x02, 0x03])], 'fake.png', { type: 'image/png' }),
    );

    const response = await POST(buildRequest(formData, cookie));
    expect(response.status).toBe(400);
  });

  it('uploads a valid image and returns its public URL', async () => {
    const cookie = await createAdminCookie();
    const formData = new FormData();
    formData.set('image', new File([pngBytes()], 'test.png', { type: 'image/png' }));

    const response = await POST(buildRequest(formData, cookie));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.url).toContain('/uploads/misc/');
  });
});
