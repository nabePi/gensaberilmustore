import { createHash, randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAuth<RouteContext>(
  async (_request, { params }) => {
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

    // Email/WhatsApp delivery is deferred to the notifications stage; logging for now.
    // eslint-disable-next-line no-console
    console.log(
      `[admin] Password reset link for ${member.email}: /reset-password?token=${rawToken}`,
    );

    return NextResponse.json({ message: 'Tautan reset password telah dibuat' });
  },
  { role: 'ADMIN' },
);
