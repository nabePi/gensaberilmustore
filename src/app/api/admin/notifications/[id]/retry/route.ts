import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { dispatchNotification } from '@/server/notify/dispatch';

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAuth<RouteContext>(
  async (_request, { params }) => {
    const { id } = await params;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      return NextResponse.json({ error: 'Notifikasi tidak ditemukan' }, { status: 404 });
    }

    if (notification.status === 'SENT') {
      return NextResponse.json({ error: 'Notifikasi sudah terkirim' }, { status: 400 });
    }

    await dispatchNotification(id);

    const updated = await prisma.notification.findUnique({ where: { id } });
    return NextResponse.json(updated);
  },
  { role: 'ADMIN' },
);
