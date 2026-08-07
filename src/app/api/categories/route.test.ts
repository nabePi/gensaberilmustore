import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/categories/route';
import { prisma } from '@/lib/db';

const createdCategoryIds: string[] = [];

async function createCategory(data: {
  name: string;
  parentId?: string | null;
  isActive?: boolean;
}) {
  const slug = `${data.name.toLowerCase().replace(/\s+/g, '-')}-${randomUUID().slice(0, 8)}`;
  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug,
      parentId: data.parentId ?? null,
      isActive: data.isActive ?? true,
    },
  });
  createdCategoryIds.push(category.id);
  return category;
}

describe('GET /api/categories', () => {
  afterAll(async () => {
    await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
  });

  it('returns a parent -> children tree of active categories', async () => {
    const parent = await createCategory({ name: `Test Parent ${randomUUID()}` });
    const child = await createCategory({ name: `Test Child ${randomUUID()}`, parentId: parent.id });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    const parentNode = json.categories.find((c: { id: string }) => c.id === parent.id);
    expect(parentNode).toBeDefined();
    expect(parentNode.children.map((c: { id: string }) => c.id)).toContain(child.id);
  });

  it('excludes inactive categories', async () => {
    const inactive = await createCategory({
      name: `Test Inactive ${randomUUID()}`,
      isActive: false,
    });

    const response = await GET();
    const json = await response.json();

    const found = json.categories.some((c: { id: string }) => c.id === inactive.id);
    expect(found).toBe(false);
  });
});
