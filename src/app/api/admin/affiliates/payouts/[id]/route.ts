import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { dispatchNotification } from '@/server/notify/dispatch';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAuth<RouteContext>(
  async (_request, { params }) => {
    const { id } = await params;

    const payout = await prisma.affiliatePayout.findUnique({
      where: { id },
      include: { affiliateProfile: { include: { user: true } } },
    });

    if (!payout) {
      return NextResponse.json({ error: 'Payout tidak ditemukan' }, { status: 404 });
    }

    if (payout.status !== 'PENDING') {
      return NextResponse.json({ error: 'Payout ini sudah diproses' }, { status: 400 });
    }

    const { user } = payout.affiliateProfile;
    const payloadJson = { name: user.name ?? user.email, totalAmount: payout.totalAmount };

    const { updated, notificationId } = await prisma.$transaction(async (tx) => {
      const result = await tx.affiliatePayout.update({
        where: { id: payout.id },
        data: { status: 'PAID', paidAt: new Date() },
      });

      const notification = await tx.notification.create({
        data: {
          channel: 'EMAIL',
          recipient: user.email,
          template: 'AFFILIATE_PAYOUT',
          relatedUserId: user.id,
          payloadJson,
        },
      });

      return { updated: result, notificationId: notification.id };
    });

    await dispatchNotification(notificationId);

    return NextResponse.json(updated);
  },
  { role: 'ADMIN' },
);
