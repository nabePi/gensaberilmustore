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

export const GET = withAuth(
  async () => {
    const [config, sectionProducts] = await Promise.all([
      prisma.homepageConfig.findUnique({ where: { id: 1 } }),
      prisma.homepageSectionProduct.findMany({
        orderBy: { position: 'asc' },
        select: { sectionKey: true, productId: true },
      }),
    ]);

    const sections = Object.fromEntries(
      SECTION_KEYS.map((key) => [
        key,
        sectionProducts.filter((row) => row.sectionKey === key).map((row) => row.productId),
      ]),
    );

    return NextResponse.json({ config, sections });
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

    const { sections, ...configData } = parsed.data;

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
    });

    const config = await prisma.homepageConfig.findUnique({ where: { id: 1 } });
    return NextResponse.json({ config, sections });
  },
  { role: 'ADMIN' },
);
