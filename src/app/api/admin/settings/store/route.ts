import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { storeSettingUpdateSchema } from '@/server/settings/schema';

export const GET = withAuth(
  async (_request: NextRequest, { user }) => {
    const [setting, orderCount, productCount, memberCount] = await Promise.all([
      prisma.storeSetting.findUnique({ where: { id: 1 } }),
      prisma.order.count(),
      prisma.product.count(),
      prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
    ]);

    return NextResponse.json({
      setting,
      admin: { name: user.name, email: user.email },
      storage: { orderCount, productCount, memberCount },
      canResetOrders: process.env.NODE_ENV !== 'production',
    });
  },
  { role: 'ADMIN' },
);

export const PUT = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = storeSettingUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const setting = await prisma.storeSetting.upsert({
      where: { id: 1 },
      create: { id: 1, ...parsed.data },
      update: parsed.data,
    });

    return NextResponse.json({ setting });
  },
  { role: 'ADMIN' },
);
