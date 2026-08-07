import type { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import {
  ADMIN_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '@/server/auth/session';

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  avatarUrl: string | null;
};

async function loadSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    select: {
      expiresAt: true,
      user: { select: { id: true, email: true, name: true, role: true, avatarUrl: true } },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

export function getSession(request: NextRequest): Promise<SessionUser | null> {
  return loadSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function getAdminSession(request: NextRequest): Promise<SessionUser | null> {
  return loadSession(request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value);
}

export class UnauthorizedError extends Error {}

export class ForbiddenError extends Error {}

export async function requireUser(request: NextRequest, role?: Role): Promise<SessionUser> {
  const user = role === 'ADMIN' ? await getAdminSession(request) : await getSession(request);

  if (!user) {
    throw new UnauthorizedError('Sesi tidak ditemukan');
  }

  if (role && user.role !== role) {
    throw new ForbiddenError('Akses ditolak');
  }

  return user;
}

type AuthHandler<Context> = (
  request: NextRequest,
  context: Context & { user: SessionUser },
) => Promise<NextResponse> | NextResponse;

type WithAuthOptions = {
  role?: Role;
};

export function withAuth<Context = Record<string, never>>(
  handler: AuthHandler<Context>,
  options: WithAuthOptions = {},
) {
  return async function authenticatedHandler(
    request: NextRequest,
    context?: Context,
  ): Promise<NextResponse> {
    try {
      const user = await requireUser(request, options.role);
      return await handler(request, { ...(context ?? ({} as Context)), user });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error instanceof ForbiddenError) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      throw error;
    }
  };
}
