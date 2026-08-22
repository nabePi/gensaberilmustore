import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { homepageBannersUpdateSchema } from '@/server/config/schema';

const BANNER_SLOTS = ['HERO_MAIN', 'HERO_SIDE_1', 'HERO_SIDE_2'] as const;

async function getHomepageBannerConfig() {
  const [config, bannerRows] = await Promise.all([
    prisma.homepageConfig.findUnique({ where: { id: 1 } }),
    prisma.homepageBanner.findMany({ orderBy: [{ slot: 'asc' }, { position: 'asc' }] }),
  ]);

  return {
    config,
    banners: {
      HERO_MAIN: bannerRows.filter((row) => row.slot === 'HERO_MAIN'),
      HERO_SIDE_1: bannerRows.filter((row) => row.slot === 'HERO_SIDE_1'),
      HERO_SIDE_2: bannerRows.filter((row) => row.slot === 'HERO_SIDE_2'),
    },
  };
}

export const GET = withAuth(
  async () => {
    return NextResponse.json(await getHomepageBannerConfig());
  },
  { role: 'ADMIN' },
);

export const PUT = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = homepageBannersUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { banners } = parsed.data;

    // Only touch homepage banners here; homepage sections are managed by
    // /api/admin/config/homepage/sections and must stay untouched.
    await prisma.$transaction(async (tx) => {
      await tx.homepageConfig.upsert({
        where: { id: 1 },
        create: { id: 1 },
        update: {},
      });

      await tx.homepageBanner.deleteMany();
      for (const slot of BANNER_SLOTS) {
        const bannerList = banners[slot];
        if (bannerList.length === 0) continue;
        await tx.homepageBanner.createMany({
          data: bannerList.map((banner, position) => ({
            slot,
            imageUrl: banner.imageUrl,
            linkUrl: banner.linkUrl || null,
            position,
          })),
        });
      }
    });

    return NextResponse.json(await getHomepageBannerConfig());
  },
  { role: 'ADMIN' },
);
