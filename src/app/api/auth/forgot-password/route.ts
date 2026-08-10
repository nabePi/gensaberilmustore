import { createHash, randomBytes } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { checkForgotPasswordRateLimit } from '@/server/auth/rate-limit';
import { dispatchNotification } from '@/server/notify/dispatch';

const GENERIC_MESSAGE = 'Jika email terdaftar, tautan reset dikirim';
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const forgotPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid'),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email } = parsed.data;
  const rateLimit = checkForgotPasswordRateLimit(email.toLowerCase());

  if (!rateLimit.limited) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });

      const resetUrl = new URL(
        `/reset-password?token=${rawToken}`,
        request.nextUrl.origin,
      ).toString();

      const notification = await prisma.notification.create({
        data: {
          channel: 'EMAIL',
          recipient: user.email,
          template: 'PASSWORD_RESET',
          relatedUserId: user.id,
          payloadJson: { resetUrl },
        },
      });

      await dispatchNotification(notification.id);
    }
  }

  return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
}
