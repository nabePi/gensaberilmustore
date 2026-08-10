import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';

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
    const payloadJson = { payoutId: payout.id, totalAmount: payout.totalAmount };

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.affiliatePayout.update({
        where: { id: payout.id },
        data: { status: 'PAID', paidAt: new Date() },
      });

      const notifications: { channel: 'EMAIL' | 'WHATSAPP'; recipient: string }[] = [
        { channel: 'EMAIL', recipient: user.email },
      ];
      if (user.phone) {
        notifications.push({ channel: 'WHATSAPP', recipient: user.phone });
      }

      await tx.notification.createMany({
        data: notifications.map((notification) => ({
          ...notification,
          template: 'AFFILIATE_PAYOUT',
          relatedUserId: user.id,
          payloadJson,
        })),
      });

      return result;
    });

    return NextResponse.json(updated);
  },
  { role: 'ADMIN' },
);
