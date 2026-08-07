import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { createCategorySchema } from '@/server/categories/schema';
import { generateUniqueSlug } from '@/server/products/slug';

export const POST = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, parentId = null, position, isActive } = parsed.data;

    const duplicate = await prisma.category.findFirst({
      where: { parentId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: { name: ['Nama kategori sudah ada di level ini'] } },
        { status: 409 },
      );
    }

    const slug = await generateUniqueSlug(name, async (candidate) =>
      Boolean(
        await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } }),
      ),
    );

    const category = await prisma.category.create({
      data: { name, slug, parentId, position, isActive },
    });

    return NextResponse.json(category, { status: 201 });
  },
  { role: 'ADMIN' },
);
