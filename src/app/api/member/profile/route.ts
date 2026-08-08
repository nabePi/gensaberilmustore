import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { updateProfileSchema } from '@/server/member/schema';

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  whatsappNumber: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
} as const;

export const GET = withAuth(async (_request: NextRequest, { user }) => {
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: PROFILE_SELECT,
  });

  return NextResponse.json(profile);
});

export const PUT = withAuth(async (request: NextRequest, { user }) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const profile = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
    select: PROFILE_SELECT,
  });

  return NextResponse.json(profile);
});
