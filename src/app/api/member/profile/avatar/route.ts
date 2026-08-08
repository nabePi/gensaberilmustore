import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { extensionForMime, MAX_AVATAR_SIZE_BYTES, sniffImageMime } from '@/server/uploads/image';
import { deleteAvatarImageFile, saveAvatarImage } from '@/server/uploads/storage';

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get('avatar');

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: { avatar: ['File foto wajib diunggah'] } },
      { status: 400 },
    );
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: { avatar: ['Ukuran file maksimal 2MB'] } },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageMime(bytes);
  const extension = mime ? extensionForMime(mime) : null;

  if (!extension) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: { avatar: ['Tipe file harus JPEG, PNG, atau WEBP'] } },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  });

  const avatarUrl = await saveAvatarImage(user.id, bytes, extension);

  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });

  if (existing?.avatarUrl) {
    await deleteAvatarImageFile(existing.avatarUrl);
  }

  return NextResponse.json({ avatarUrl });
});

export const DELETE = withAuth(async (_request: NextRequest, { user }) => {
  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  });

  if (existing?.avatarUrl) {
    await deleteAvatarImageFile(existing.avatarUrl);
  }

  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });

  return NextResponse.json({ avatarUrl: null });
});
