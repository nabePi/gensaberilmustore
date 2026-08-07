import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { DUMMY_PASSWORD_HASH, verifyPassword } from '@/server/auth/password';
import { checkLoginRateLimit, resetLoginRateLimit } from '@/server/auth/rate-limit';
import {
  createSession,
  DEFAULT_SESSION_DURATION_MS,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '@/server/auth/session';
import { getClientIp } from '@/server/http/client-ip';

const REMEMBER_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const GENERIC_ERROR_MESSAGE = 'Email atau password salah';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
  remember: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkLoginRateLimit(ip);

  if (rateLimit.limited) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan login, coba lagi nanti' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password, remember } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const isPasswordValid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !isPasswordValid || user.role === 'ADMIN') {
    return NextResponse.json({ error: GENERIC_ERROR_MESSAGE }, { status: 401 });
  }

  resetLoginRateLimit(ip);

  const { session, token } = await createSession({
    userId: user.id,
    ipAddress: ip,
    userAgent: request.headers.get('user-agent'),
    durationMs: remember ? REMEMBER_SESSION_DURATION_MS : DEFAULT_SESSION_DURATION_MS,
  });

  const response = NextResponse.json(
    {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    },
    { status: 200 },
  );

  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(session.expiresAt));

  return response;
}
