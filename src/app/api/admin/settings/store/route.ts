import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { validateStaticQris } from '@/server/payment/qris';
import { storeSettingUpdateSchema } from '@/server/settings/schema';

export const GET = withAuth(
  async () => {
    const setting = await prisma.storeSetting.findUnique({ where: { id: 1 } });

    return NextResponse.json({ setting });
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

    if (parsed.data.qrisStaticCode) {
      const qrisError = validateStaticQris(parsed.data.qrisStaticCode);
      if (qrisError) {
        return NextResponse.json(
          { error: 'Validasi gagal', issues: { qrisStaticCode: [qrisError] } },
          { status: 400 },
        );
      }
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
