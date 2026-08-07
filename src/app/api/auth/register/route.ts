import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';
import { createSession, sessionCookieOptions, SESSION_COOKIE_NAME } from '@/server/auth/session';

const INDONESIAN_PHONE_REGEX = /^(?:\+62|62|0)8[1-9][0-9]{6,10}$/;

const registerSchema = z
  .object({
    name: z.string().min(3, 'Nama minimal 3 karakter'),
    email: z.string().email('Format email tidak valid'),
    phone: z.string().optional(),
    whatsappNumber: z
      .string()
      .min(1, 'Nomor WhatsApp wajib diisi')
      .regex(INDONESIAN_PHONE_REGEX, 'Format nomor WhatsApp tidak valid'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/[A-Za-z]/, 'Password harus mengandung huruf')
      .regex(/[0-9]/, 'Password harus mengandung angka'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, phone, whatsappNumber, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      phone,
      whatsappNumber,
      role: 'BUYER',
    },
  });

  // Email verification is deferred to the notifications stage (GEN-82); logging for now.
  // eslint-disable-next-line no-console
  console.log(`[auth] Verification email pending for ${user.email}`);

  const { session, token } = await createSession({
    userId: user.id,
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  });

  const response = NextResponse.json(
    {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    },
    { status: 201 },
  );

  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(session.expiresAt));

  return response;
}
