import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/products/route';
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

function buildRequest(query: string) {
  return new NextRequest(`http://localhost/api/products?${query}`);
}

describe('GET /api/products', () => {
  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
  });

  it('paginates results', async () => {
    for (let i = 0; i < 3; i += 1) {
      await createProduct();
    }

    const response = await GET(buildRequest('limit=2&page=1'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items.length).toBeLessThanOrEqual(2);
    expect(json.limit).toBe(2);
    expect(json.page).toBe(1);
  });

  it('filters by category slug', async () => {
    const category = await prisma.category.create({
      data: { name: `Cat ${randomUUID()}`, slug: `cat-${randomUUID()}` },
    });
    createdCategoryIds.push(category.id);
    const product = await createProduct({ categories: { create: { categoryId: category.id } } });

    const response = await GET(buildRequest(`category=${category.slug}`));
    const json = await response.json();

    expect(json.items.some((item: { id: string }) => item.id === product.id)).toBe(true);
  });

  it('filters by price range', async () => {
    const cheap = await createProduct({ price: 5000, finalPrice: 5000 });
    const expensive = await createProduct({ price: 500000, finalPrice: 500000 });

    const response = await GET(buildRequest('minPrice=1000&maxPrice=10000'));
    const json = await response.json();
    const ids = json.items.map((item: { id: string }) => item.id);

    expect(ids).toContain(cheap.id);
    expect(ids).not.toContain(expensive.id);
  });

  it('filters by stock availability', async () => {
    const outOfStock = await createProduct({ stock: 0 });

    const response = await GET(buildRequest('inStock=false'));
    const json = await response.json();
    const ids = json.items.map((item: { id: string }) => item.id);

    expect(ids).toContain(outOfStock.id);
  });

  it('sorts by price ascending and descending', async () => {
    const low = await createProduct({ price: 1111, finalPrice: 1111 });
    const high = await createProduct({ price: 9999999, finalPrice: 9999999 });

    const ascResponse = await GET(buildRequest('sort=price_asc&limit=60'));
    const ascJson = await ascResponse.json();
    const ascIds = ascJson.items.map((item: { id: string }) => item.id);
    expect(ascIds.indexOf(low.id)).toBeLessThan(ascIds.indexOf(high.id));

    const descResponse = await GET(buildRequest('sort=price_desc&limit=60'));
    const descJson = await descResponse.json();
    const descIds = descJson.items.map((item: { id: string }) => item.id);
    expect(descIds.indexOf(high.id)).toBeLessThan(descIds.indexOf(low.id));
  });

  it('does not error on popular sort', async () => {
    const response = await GET(buildRequest('sort=popular'));
    expect(response.status).toBe(200);
  });

  it('searches by title text', async () => {
    const uniqueWord = `Zephyrion${randomUUID().slice(0, 8)}`;
    const product = await createProduct({ title: `Buku ${uniqueWord}` });

    const response = await GET(buildRequest(`q=${uniqueWord}`));
    const json = await response.json();
    const ids = json.items.map((item: { id: string }) => item.id);

    expect(ids).toContain(product.id);
  });

  it('excludes inactive products', async () => {
    const inactive = await createProduct({ isActive: false });

    const response = await GET(buildRequest('limit=60'));
    const json = await response.json();
    const ids = json.items.map((item: { id: string }) => item.id);

    expect(ids).not.toContain(inactive.id);
  });

  it('rejects invalid query params', async () => {
    const response = await GET(buildRequest('minPrice=100&maxPrice=10'));
    expect(response.status).toBe(400);
  });
});
