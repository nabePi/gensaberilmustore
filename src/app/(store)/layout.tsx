import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/layout/SiteFooter';
import type { NavCategory } from '@/components/layout/SiteHeader';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/server/auth';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  position: number;
};

function buildCategoryTree(rows: CategoryRow[]): NavCategory[] {
  const byId = new Map<string, NavCategory>(
    rows.map((row) => [row.id, { id: row.id, name: row.name, slug: row.slug, children: [] }]),
  );
  const roots: NavCategory[] = [];

  for (const row of rows) {
    const node = byId.get(row.id);
    if (!node) continue;
    const parent = row.parentId ? byId.get(row.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [categoryRows, user] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, slug: true, parentId: true, position: true },
    }),
    getSessionUser(),
  ]);

  const categories = buildCategoryTree(categoryRows);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        categories={categories}
        initialUser={user ? { id: user.id, name: user.name, email: user.email } : null}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
