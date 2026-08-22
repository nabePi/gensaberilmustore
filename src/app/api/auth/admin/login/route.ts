import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyMd5Password,
  verifyPassword,
} from '@/server/auth/password';
import { checkAdminLoginRateLimit, resetAdminLoginRateLimit } from '@/server/auth/rate-limit';
import {
  ADMIN_SESSION_COOKIE_NAME,
  createSession,
  DEFAULT_SESSION_DURATION_MS,
  sessionCookieOptions,
} from '@/server/auth/session';
import { getClientIp } from '@/server/http/client-ip';

const GENERIC_ERROR_MESSAGE = 'Email atau password salah';

const adminLoginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkAdminLoginRateLimit(ip);

  if (rateLimit.limited) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan login, coba lagi nanti' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Legacy users imported from the previous store authenticate with their MD5
  // password (passwordmd5); everyone else uses the bcrypt passwordHash.
  const usesLegacyMd5 = Boolean(user?.passwordmd5);
  const isPasswordValid = usesLegacyMd5
    ? verifyMd5Password(password, user!.passwordmd5!)
    : await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !isPasswordValid || user.role !== 'ADMIN') {
    return NextResponse.json({ error: GENERIC_ERROR_MESSAGE }, { status: 401 });
  }

  // Transparently upgrade legacy MD5 passwords to bcrypt on successful login.
  if (usesLegacyMd5) {
    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordmd5: null },
    });
  }

  resetAdminLoginRateLimit(ip);

  const { session, token } = await createSession({
    userId: user.id,
    ipAddress: ip,
    userAgent: request.headers.get('user-agent'),
    durationMs: DEFAULT_SESSION_DURATION_MS,
  });

  const response = NextResponse.json(
    {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    },
    { status: 200 },
  );

  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, sessionCookieOptions(session.expiresAt));

  return response;
}
