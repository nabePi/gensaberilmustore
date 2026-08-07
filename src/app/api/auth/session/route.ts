import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/server/auth/session';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return NextResponse.json({ user: null });
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    select: {
      expiresAt: true,
      user: {
        select: { id: true, email: true, name: true, role: true, avatarUrl: true },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: session.user });
}
