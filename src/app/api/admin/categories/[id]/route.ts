import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { updateCategorySchema } from '@/server/categories/schema';

type RouteContext = { params: Promise<{ id: string }> };

export const PUT = withAuth<RouteContext>(
  async (request: NextRequest, { params }) => {
    const { id } = await params;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = updateCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, parentId, position, isActive } = parsed.data;

    if (name !== undefined || parentId !== undefined) {
      const effectiveName = name ?? existing.name;
      const effectiveParentId = parentId !== undefined ? parentId : existing.parentId;

      const duplicate = await prisma.category.findFirst({
        where: {
          id: { not: id },
          parentId: effectiveParentId,
          name: { equals: effectiveName, mode: 'insensitive' },
        },
        select: { id: true },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'Validasi gagal', issues: { name: ['Nama kategori sudah ada di level ini'] } },
          { status: 409 },
        );
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(parentId !== undefined ? { parentId } : {}),
        ...(position !== undefined ? { position } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json(category);
  },
  { role: 'ADMIN' },
);

export const DELETE = withAuth<RouteContext>(
  async (_request: NextRequest, { params }) => {
    const { id } = await params;

    const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    const linkedProductCount = await prisma.categoryProduct.count({ where: { categoryId: id } });
    if (linkedProductCount > 0) {
      return NextResponse.json(
        { error: `Kategori masih terhubung dengan ${linkedProductCount} produk` },
        { status: 409 },
      );
    }

    await prisma.category.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  },
  { role: 'ADMIN' },
);
