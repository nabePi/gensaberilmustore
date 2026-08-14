import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { createCategorySchema } from '@/server/categories/schema';
import { generateUniqueSlug } from '@/server/products/slug';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  position: number;
  isActive: boolean;
  _count: { products: number };
};

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  position: number;
  isActive: boolean;
  productCount: number;
  children: CategoryNode[];
};

function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        slug: row.slug,
        parentId: row.parentId,
        position: row.position,
        isActive: row.isActive,
        productCount: row._count.products,
        children: [],
      },
    ]),
  );
  const roots: CategoryNode[] = [];

  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export const GET = withAuth(
  async () => {
    const categories = await prisma.category.findMany({
      orderBy: { position: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        position: true,
        isActive: true,
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ categories: buildTree(categories) });
  },
  { role: 'ADMIN' },
);

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
