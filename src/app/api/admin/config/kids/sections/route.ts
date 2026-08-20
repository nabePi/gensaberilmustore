import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { kidsSectionsUpdateSchema } from '@/server/config/schema';

function serializeSections(
  sections: {
    id: string;
    title: string;
    subtitle: string;
    badge: string;
    theme: string;
    showDiscountTag: boolean;
    position: number;
    items: { productId: string; position: number }[];
  }[],
) {
  return sections
    .map((section) => ({
      id: section.id,
      title: section.title,
      subtitle: section.subtitle,
      badge: section.badge,
      theme: section.theme,
      showDiscountTag: section.showDiscountTag,
      position: section.position,
      productIds: section.items.sort((a, b) => a.position - b.position).map((p) => p.productId),
    }))
    .sort((a, b) => a.position - b.position);
}

async function loadSections() {
  const sections = await prisma.kidsSection.findMany({
    orderBy: { position: 'asc' },
    include: {
      items: {
        orderBy: { position: 'asc' },
        select: { productId: true, position: true },
      },
    },
  });
  return serializeSections(sections);
}

export const GET = withAuth(
  async () => {
    return NextResponse.json({ sections: await loadSections() });
  },
  { role: 'ADMIN' },
);

export const PUT = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = kidsSectionsUpdateSchema.safeParse(body);

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

    await prisma.$transaction(async (tx) => {
      const existingSections = await tx.kidsSection.findMany({ select: { id: true } });
      const incomingIds = new Set(sections.map((s) => s.id).filter(Boolean));
      const idsToDelete = existingSections.map((s) => s.id).filter((id) => !incomingIds.has(id));

      if (idsToDelete.length > 0) {
        await tx.kidsSection.deleteMany({ where: { id: { in: idsToDelete } } });
      }

      for (const [position, section] of sections.entries()) {
        const { id, productIds, ...rest } = section;
        const sectionData = { ...rest, position };
        const upserted = await tx.kidsSection.upsert({
          where: { id: id ?? '' },
          create: sectionData,
          update: sectionData,
        });

        await tx.kidsSectionItem.deleteMany({ where: { sectionId: upserted.id } });

        if (productIds.length > 0) {
          await tx.kidsSectionItem.createMany({
            data: productIds.map((productId, itemPosition) => ({
              sectionId: upserted.id,
              productId,
              position: itemPosition,
            })),
          });
        }
      }
    });

    return NextResponse.json({ sections: await loadSections() });
  },
  { role: 'ADMIN' },
);
