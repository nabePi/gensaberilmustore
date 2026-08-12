import type { HomepageSectionKey } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { homepageConfigUpdateSchema } from '@/server/config/schema';

const SECTION_KEYS: HomepageSectionKey[] = [
  'NEWEST',
  'BESTSELLER',
  'INTERNATIONAL',
  'KIWARI',
  'KLASIK',
  'OTHERS',
];

const BANNER_SLOTS = ['HERO_MAIN', 'HERO_SIDE_1', 'HERO_SIDE_2'] as const;

function serializeBanners(
  rows: { id: string; slot: string; imageUrl: string; linkUrl: string | null; position: number }[],
) {
  return Object.fromEntries(
    BANNER_SLOTS.map((slot) => [
      slot,
      rows
        .filter((row) => row.slot === slot)
        .map((row) => ({ id: row.id, imageUrl: row.imageUrl, linkUrl: row.linkUrl ?? '' })),
    ]),
  );
}

export const GET = withAuth(
  async () => {
    const [config, sectionProducts, bannerRows] = await Promise.all([
      prisma.homepageConfig.findUnique({ where: { id: 1 } }),
      prisma.homepageSectionProduct.findMany({
        orderBy: { position: 'asc' },
        select: { sectionKey: true, productId: true },
      }),
      prisma.homepageBanner.findMany({ orderBy: [{ slot: 'asc' }, { position: 'asc' }] }),
    ]);

    const sections = Object.fromEntries(
      SECTION_KEYS.map((key) => [
        key,
        sectionProducts.filter((row) => row.sectionKey === key).map((row) => row.productId),
      ]),
    );

    return NextResponse.json({ config, sections, banners: serializeBanners(bannerRows) });
  },
  { role: 'ADMIN' },
);

export const PUT = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = homepageConfigUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { sections, banners, ...configData } = parsed.data;

    const allProductIds = SECTION_KEYS.flatMap((key) => sections[key]);
    if (allProductIds.length > 0) {
      const foundCount = await prisma.product.count({ where: { id: { in: allProductIds } } });
      if (foundCount !== new Set(allProductIds).size) {
        return NextResponse.json(
          { error: 'Validasi gagal', issues: { sections: ['Beberapa produk tidak ditemukan'] } },
          { status: 400 },
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.homepageConfig.upsert({
        where: { id: 1 },
        create: { id: 1, ...configData },
        update: configData,
      });

      await tx.homepageSectionProduct.deleteMany();

      for (const key of SECTION_KEYS) {
        const productIds = sections[key];
        if (productIds.length === 0) continue;
        await tx.homepageSectionProduct.createMany({
          data: productIds.map((productId, position) => ({
            sectionKey: key,
            productId,
            position,
          })),
        });
      }

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

    const [config, bannerRows] = await Promise.all([
      prisma.homepageConfig.findUnique({ where: { id: 1 } }),
      prisma.homepageBanner.findMany({ orderBy: [{ slot: 'asc' }, { position: 'asc' }] }),
    ]);

    return NextResponse.json({ config, sections, banners: serializeBanners(bannerRows) });
  },
  { role: 'ADMIN' },
);
