import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/products/[slug]/route';
import { prisma } from '@/lib/db';

const createdProductIds: string[] = [];
const createdCategoryIds: string[] = [];

async function createProduct(
  overrides: Partial<Parameters<typeof prisma.product.create>[0]['data']> = {},
) {
  const product = await prisma.product.create({
    data: {
      sku: `SKU-${randomUUID()}`,
      slug: `slug-${randomUUID()}`,
      title: `Test Product ${randomUUID()}`,
      subtitle: '',
      author: 'Test Author',
      imprint: 'Test Publisher',
      description: 'Desc',
      price: 100000,
      finalPrice: 100000,
      stock: 10,
      weightGram: 100,
      pageCount: 100,
      coverType: 'SOFTCOVER',
      publishYear: 2024,
      isActive: true,
      ...overrides,
    },
  });
  createdProductIds.push(product.id);
  return product;
}

function buildRequest(slug: string) {
  return new NextRequest(`http://localhost/api/products/${slug}`);
}

function context(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe('GET /api/products/[slug]', () => {
  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
  });

  it('returns 404 for a non-existent slug', async () => {
    const response = await GET(buildRequest('does-not-exist'), context('does-not-exist'));
    expect(response.status).toBe(404);
  });

  it('returns 404 for an inactive product', async () => {
    const inactive = await createProduct({ isActive: false });
    const response = await GET(buildRequest(inactive.slug), context(inactive.slug));
    expect(response.status).toBe(404);
  });

  it('maps imprint to publisher in the response', async () => {
    const product = await createProduct();
    const response = await GET(buildRequest(product.slug), context(product.slug));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.publisher).toBe('Test Publisher');
    expect(json.imprint).toBeUndefined();
  });

  it('returns related products sharing a category, excluding itself', async () => {
    const category = await prisma.category.create({
      data: { name: `Cat ${randomUUID()}`, slug: `cat-${randomUUID()}` },
    });
    createdCategoryIds.push(category.id);

    const product = await createProduct({ categories: { create: { categoryId: category.id } } });
    const related = await createProduct({ categories: { create: { categoryId: category.id } } });
    const unrelated = await createProduct();

    const response = await GET(buildRequest(product.slug), context(product.slug));
    const json = await response.json();
    const relatedIds = json.relatedProducts.map((p: { id: string }) => p.id);

    expect(relatedIds).toContain(related.id);
    expect(relatedIds).not.toContain(product.id);
    expect(relatedIds).not.toContain(unrelated.id);
  });

  it('returns an empty related products list when the product has no categories', async () => {
    const product = await createProduct();
    const response = await GET(buildRequest(product.slug), context(product.slug));
    const json = await response.json();

    expect(json.relatedProducts).toEqual([]);
  });
});
