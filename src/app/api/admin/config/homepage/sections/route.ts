import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { homepageSectionsUpdateSchema } from '@/server/config/schema';

function serializeSections(
  sections: {
    id: string;
    key: string;
    title: string;
    subtitle: string;
    promoImageUrl: string;
    position: number;
    isEnabled: boolean;
    backgroundColor: string | null;
    titleColor: string | null;
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

async function getHomepageSections() {
  const sections = await prisma.homepageSection.findMany({
    orderBy: { position: 'asc' },
    include: {
      products: {
        orderBy: { position: 'asc' },
        select: { productId: true, position: true },
      },
    },
  });

  return { sections: serializeSections(sections) };
}

export const GET = withAuth(
  async () => {
    return NextResponse.json(await getHomepageSections());
  },
  { role: 'ADMIN' },
);

export const PUT = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = homepageSectionsUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { sections } = parsed.data;

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

    // Only touch homepage sections here; homepage banners are managed by
    // /api/admin/config/homepage and must stay untouched.
    await prisma.$transaction(async (tx) => {
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
          isEnabled: rest.isEnabled,
          backgroundColor: rest.backgroundColor || null,
          titleColor: rest.titleColor || null,
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

    return NextResponse.json(await getHomepageSections());
  },
  { role: 'ADMIN' },
);
