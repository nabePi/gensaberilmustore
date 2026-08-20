import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { kidsConfigUpdateSchema } from '@/server/config/schema';

export const GET = withAuth(
  async () => {
    const [config, banners] = await Promise.all([
      prisma.kidsConfig.findUnique({ where: { id: 1 } }),
      prisma.kidsBanner.findMany({ orderBy: { position: 'asc' } }),
    ]);

    return NextResponse.json({ config, banners });
  },
  { role: 'ADMIN' },
);

export const PUT = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = kidsConfigUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { banners, ...configData } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.kidsConfig.upsert({
        where: { id: 1 },
        create: { id: 1, ...configData },
        update: configData,
      });

      await tx.kidsBanner.deleteMany();
      if (banners.length > 0) {
        await tx.kidsBanner.createMany({
          data: banners.map((banner, position) => ({
            imageUrl: banner.imageUrl,
            linkUrl: banner.linkUrl || null,
            position,
          })),
        });
      }
    });

    const [config, savedBanners] = await Promise.all([
      prisma.kidsConfig.findUnique({ where: { id: 1 } }),
      prisma.kidsBanner.findMany({ orderBy: { position: 'asc' } }),
    ]);

    return NextResponse.json({ config, banners: savedBanners });
  },
  { role: 'ADMIN' },
);
