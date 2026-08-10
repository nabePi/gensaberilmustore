import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { listAdminNotificationsQuerySchema } from '@/server/notify/schema';

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = listAdminNotificationsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { page, limit, status, channel } = parsed.data;

    const where = {
      ...(status ? { status } : {}),
      ...(channel ? { channel } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  },
  { role: 'ADMIN' },
);
