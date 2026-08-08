import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { DELETE, POST } from '@/app/api/member/profile/avatar/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession, SESSION_COOKIE_NAME } from '@/server/auth/session';
import { MAX_AVATAR_SIZE_BYTES } from '@/server/uploads/image';

const createdEmails: string[] = [];
const createdUserIds: string[] = [];

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngBytes(size = 32) {
  const bytes = new Uint8Array(size);
  bytes.set(PNG_HEADER);
  return bytes;
}

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

function buildPostRequest(formData: FormData, cookie: string) {
  return new NextRequest('http://localhost/api/member/profile/avatar', {
    method: 'POST',
    body: formData,
    headers: { ...(cookie ? { cookie } : {}) },
  });
}

function buildDeleteRequest(cookie: string) {
  return new NextRequest('http://localhost/api/member/profile/avatar', {
    method: 'DELETE',
    headers: { ...(cookie ? { cookie } : {}) },
  });
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  await Promise.all(
    createdUserIds.map((id) =>
      rm(path.join(process.cwd(), 'public', 'uploads', 'avatars', id), {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe('POST /api/member/profile/avatar', () => {
  it('rejects unauthenticated requests', async () => {
    const formData = new FormData();
    formData.set('avatar', new File([pngBytes()], 'test.png', { type: 'image/png' }));

    const response = await POST(buildPostRequest(formData, ''));
    expect(response.status).toBe(401);
  });

  it('rejects a missing avatar file', async () => {
    const { cookie } = await createMemberCookie();
    const response = await POST(buildPostRequest(new FormData(), cookie));
    expect(response.status).toBe(400);
  });

  it('rejects a file larger than the size limit', async () => {
    const { cookie } = await createMemberCookie();
    const formData = new FormData();
    formData.set(
      'avatar',
      new File([pngBytes(MAX_AVATAR_SIZE_BYTES + 1)], 'big.png', { type: 'image/png' }),
    );

    const response = await POST(buildPostRequest(formData, cookie));
    expect(response.status).toBe(400);
  });

  it('rejects a file whose magic bytes are not a supported image type', async () => {
    const { cookie } = await createMemberCookie();
    const formData = new FormData();
    formData.set(
      'avatar',
      new File([new Uint8Array([0x00, 0x01, 0x02, 0x03])], 'fake.png', { type: 'image/png' }),
    );

    const response = await POST(buildPostRequest(formData, cookie));
    expect(response.status).toBe(400);
  });

  it('uploads a valid avatar and updates the user record', async () => {
    const { cookie, user } = await createMemberCookie();
    const formData = new FormData();
    formData.set('avatar', new File([pngBytes()], 'test.png', { type: 'image/png' }));

    const response = await POST(buildPostRequest(formData, cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.avatarUrl).toContain(user.id);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.avatarUrl).toBe(json.avatarUrl);
  });

  it('replaces a previously uploaded avatar', async () => {
    const { cookie, user } = await createMemberCookie();

    const first = new FormData();
    first.set('avatar', new File([pngBytes()], 'first.png', { type: 'image/png' }));
    const firstResponse = await POST(buildPostRequest(first, cookie));
    const firstJson = await firstResponse.json();

    const second = new FormData();
    second.set('avatar', new File([pngBytes()], 'second.png', { type: 'image/png' }));
    const secondResponse = await POST(buildPostRequest(second, cookie));
    const secondJson = await secondResponse.json();

    expect(secondJson.avatarUrl).not.toBe(firstJson.avatarUrl);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.avatarUrl).toBe(secondJson.avatarUrl);
  });
});

describe('DELETE /api/member/profile/avatar', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await DELETE(buildDeleteRequest(''));
    expect(response.status).toBe(401);
  });

  it('clears the avatarUrl', async () => {
    const { cookie, user } = await createMemberCookie();
    const formData = new FormData();
    formData.set('avatar', new File([pngBytes()], 'test.png', { type: 'image/png' }));
    await POST(buildPostRequest(formData, cookie));

    const response = await DELETE(buildDeleteRequest(cookie));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.avatarUrl).toBeNull();

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.avatarUrl).toBeNull();
  });
});
