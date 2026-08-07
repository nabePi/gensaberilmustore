import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import {
  clearedSessionCookieOptions,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '@/server/auth/session';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      await prisma.session.deleteMany({ where: { id: payload.sid } });
    }
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE_NAME, '', clearedSessionCookieOptions());

  return response;
}
