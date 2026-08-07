import { jwtVerify, SignJWT } from 'jose';

import { env } from '@/env';
import { prisma } from '@/lib/db';

export const SESSION_COOKIE_NAME = 'session';
export const DEFAULT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day

const encodedSecret = new TextEncoder().encode(env.jwtSecret);

type CreateSessionParams = {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  durationMs?: number;
};

export async function createSession({
  userId,
  ipAddress = null,
  userAgent = null,
  durationMs = DEFAULT_SESSION_DURATION_MS,
}: CreateSessionParams) {
  const expiresAt = new Date(Date.now() + durationMs);

  const session = await prisma.session.create({
    data: { userId, expiresAt, ipAddress, userAgent },
  });

  const token = await new SignJWT({ sid: session.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(encodedSecret);

  return { session, token };
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.nodeEnv === 'production',
    expires: expiresAt,
    path: '/',
  };
}

export function clearedSessionCookieOptions() {
  return sessionCookieOptions(new Date(0));
}

export type SessionTokenPayload = {
  sid: string;
  userId: string;
};

export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    if (typeof payload.sid !== 'string' || typeof payload.sub !== 'string') {
      return null;
    }
    return { sid: payload.sid, userId: payload.sub };
  } catch {
    return null;
  }
}
