import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { homepageConfigUpdateSchema } from '@/server/config/schema';

function serializeSections(
  sections: {
    id: string;
    key: string;
    title: string;
    subtitle: string;
    promoImageUrl: string;
    position: number;
    products: { productId: string; position: number }[];
  }[],
) {
  return sections
    .map((section) => ({
      ...section,
      productIds: section.products.sort((a, b) => a.position - b.position).map((p) => p.productId),
    }))
    .sort((a, b) => a.position - b.position);
}

export const GET = withAuth(
  async () => {
    const [config, sectionProducts, bannerRows] = await Promise.all([
      prisma.homepageConfig.findUnique({ where: { id: 1 } }),
      prisma.homepageSection.findMany({
        orderBy: { position: 'asc' },
        include: {
          products: {
            orderBy: { position: 'asc' },
            select: { productId: true, position: true },
          },
        },
      }),
      prisma.homepageBanner.findMany({ orderBy: [{ slot: 'asc' }, { position: 'asc' }] }),
    ]);

    return NextResponse.json({
      config,
      sections: serializeSections(sectionProducts),
      banners: {
        HERO_MAIN: bannerRows.filter((row) => row.slot === 'HERO_MAIN'),
        HERO_SIDE_1: bannerRows.filter((row) => row.slot === 'HERO_SIDE_1'),
        HERO_SIDE_2: bannerRows.filter((row) => row.slot === 'HERO_SIDE_2'),
      },
    });
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

    const { banners, sections } = parsed.data;

    const allProductIds = sections.flatMap((section) => section.productIds);
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
        create: { id: 1 },
        update: {},
      });

      await tx.homepageBanner.deleteMany();
      const bannerSlots = ['HERO_MAIN', 'HERO_SIDE_1', 'HERO_SIDE_2'] as const;
      for (const slot of bannerSlots) {
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

      const existingSections = await tx.homepageSection.findMany({ select: { id: true } });
      const incomingIds = new Set(sections.map((s) => s.id).filter(Boolean));
      const idsToDelete = existingSections.map((s) => s.id).filter((id) => !incomingIds.has(id));

      if (idsToDelete.length > 0) {
        await tx.homepageSection.deleteMany({ where: { id: { in: idsToDelete } } });
      }

      for (const section of sections) {
        const { id, productIds, ...rest } = section;
        const sectionData = {
          key: rest.key,
          title: rest.title,
          subtitle: rest.subtitle,
          promoImageUrl: rest.promoImageUrl ?? '',
          position: rest.position,
        };
        const upserted = await tx.homepageSection.upsert({
          where: { id: id ?? '' },
          create: sectionData,
          update: sectionData,
        });

        await tx.homepageSectionProduct.deleteMany({ where: { sectionId: upserted.id } });

        if (productIds.length > 0) {
          await tx.homepageSectionProduct.createMany({
            data: productIds.map((productId, position) => ({
              sectionId: upserted.id,
              productId,
              position,
            })),
          });
        }
      }
    });

    const [config, sectionProducts, bannerRows] = await Promise.all([
      prisma.homepageConfig.findUnique({ where: { id: 1 } }),
      prisma.homepageSection.findMany({
        orderBy: { position: 'asc' },
        include: {
          products: {
            orderBy: { position: 'asc' },
            select: { productId: true, position: true },
          },
        },
      }),
      prisma.homepageBanner.findMany({ orderBy: [{ slot: 'asc' }, { position: 'asc' }] }),
    ]);

    return NextResponse.json({
      config,
      sections: serializeSections(sectionProducts),
      banners: {
        HERO_MAIN: bannerRows.filter((row) => row.slot === 'HERO_MAIN'),
        HERO_SIDE_1: bannerRows.filter((row) => row.slot === 'HERO_SIDE_1'),
        HERO_SIDE_2: bannerRows.filter((row) => row.slot === 'HERO_SIDE_2'),
      },
    });
  },
  { role: 'ADMIN' },
);
