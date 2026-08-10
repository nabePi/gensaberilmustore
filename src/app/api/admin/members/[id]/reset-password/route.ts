import { createHash, randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { dispatchNotification } from '@/server/notify/dispatch';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAuth<RouteContext>(
  async (request, { params }) => {
    const { id } = await params;

    const member = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });

    if (!member || member.role === 'ADMIN') {
      return NextResponse.json({ error: 'Member tidak ditemukan' }, { status: 404 });
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await prisma.passwordResetToken.create({
      data: {
        userId: member.id,
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
        recipient: member.email,
        template: 'PASSWORD_RESET',
        relatedUserId: member.id,
        payloadJson: { resetUrl },
      },
    });

    await dispatchNotification(notification.id);

    return NextResponse.json({ message: 'Tautan reset password telah dibuat' });
  },
  { role: 'ADMIN' },
);
