import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { createHomepageSectionSchema, homepageSectionsUpdateSchema } from '@/server/config/schema';

function serializeSections(
  sections: {
    id: string;
    key: string;
    title: string;
    position: number;
    isEnabled: boolean;
    type: 'REGULAR' | 'PROMO';
  }[],
) {
  return [...sections].sort((a, b) => a.position - b.position);
}

async function getHomepageSections() {
  const sections = await prisma.homepageSection.findMany({
    orderBy: { position: 'asc' },
    select: { id: true, key: true, title: true, position: true, isEnabled: true, type: true },
  });

  return { sections: serializeSections(sections) };
}

export const GET = withAuth(
  async () => {
    return NextResponse.json(await getHomepageSections());
  },
  { role: 'ADMIN' },
);

// List-level route: only touches section metadata + ordering (rename/reorder/toggle/delete).
// Product curation and promo discounts are owned by /api/admin/config/homepage/sections/[id].
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

    // Only touch homepage sections here; homepage banners are managed by
    // /api/admin/config/homepage and must stay untouched.
    await prisma.$transaction(async (tx) => {
      const existingSections = await tx.homepageSection.findMany({ select: { id: true } });
      const incomingIds = new Set(sections.map((s) => s.id));
      const idsToDelete = existingSections.map((s) => s.id).filter((id) => !incomingIds.has(id));

      if (idsToDelete.length > 0) {
        await tx.homepageSection.deleteMany({ where: { id: { in: idsToDelete } } });
      }

      for (const section of sections) {
        await tx.homepageSection.update({
          where: { id: section.id },
          data: {
            key: section.key,
            title: section.title,
            position: section.position,
            isEnabled: section.isEnabled,
          },
        });
      }
    });

    return NextResponse.json(await getHomepageSections());
  },
  { role: 'ADMIN' },
);

export const POST = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = createHomepageSectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { title, key } = parsed.data;

    const existing = await prisma.homepageSection.findUnique({ where: { key } });
    if (existing) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: { key: ['Key sudah digunakan'] } },
        { status: 400 },
      );
    }

    const position = await prisma.homepageSection.count();

    const section = await prisma.homepageSection.create({
      data: {
        key,
        title,
        subtitle: '',
        promoImageUrl: '',
        position,
        isEnabled: false,
        type: 'REGULAR',
        backgroundColor: null,
        titleColor: null,
      },
    });

    return NextResponse.json({ id: section.id }, { status: 201 });
  },
  { role: 'ADMIN' },
);
