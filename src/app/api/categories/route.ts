import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  position: number;
};

type CategoryNode = CategoryRow & { children: CategoryNode[] };

function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>(rows.map((row) => [row.id, { ...row, children: [] }]));
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

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { position: 'asc' },
    select: { id: true, name: true, slug: true, parentId: true, position: true },
  });

  return NextResponse.json({ categories: buildTree(categories) });
}
