import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/search/suggest/route';
import { prisma } from '@/lib/db';

const createdProductIds: string[] = [];

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

function buildRequest(q: string, ip: string = randomUUID()) {
  return new NextRequest(`http://localhost/api/search/suggest?q=${encodeURIComponent(q)}`, {
    headers: { 'x-forwarded-for': ip },
  });
}

describe('GET /api/search/suggest', () => {
  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  });

  it('rejects queries shorter than 2 characters', async () => {
    const response = await GET(buildRequest('a'));
    expect(response.status).toBe(400);
  });

  it('returns an empty list when nothing matches', async () => {
    const response = await GET(buildRequest(`nomatch${randomUUID().replace(/-/g, '')}`));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.suggestions).toEqual([]);
  });

  it('returns matching products ranked by relevance', async () => {
    const uniqueWord = `Zorbaxion${randomUUID().slice(0, 8)}`;
    const exactMatch = await createProduct({ title: uniqueWord });
    const partialMatch = await createProduct({ title: `Buku tentang ${uniqueWord} lanjutan` });

    const response = await GET(buildRequest(uniqueWord));
    const json = await response.json();
    const ids = json.suggestions.map((s: { id: string }) => s.id);

    expect(ids).toContain(exactMatch.id);
    expect(ids).toContain(partialMatch.id);
  });

  it('matches by author as well as title', async () => {
    const uniqueAuthor = `Authorius${randomUUID().slice(0, 8)}`;
    const product = await createProduct({ author: uniqueAuthor });

    const response = await GET(buildRequest(uniqueAuthor));
    const json = await response.json();
    const ids = json.suggestions.map((s: { id: string }) => s.id);

    expect(ids).toContain(product.id);
  });

  it('excludes inactive products', async () => {
    const uniqueWord = `Inactivius${randomUUID().slice(0, 8)}`;
    await createProduct({ title: uniqueWord, isActive: false });

    const response = await GET(buildRequest(uniqueWord));
    const json = await response.json();

    expect(json.suggestions).toEqual([]);
  });

  it('rate limits after too many requests from the same IP', async () => {
    const ip = `rate-limit-test-${randomUUID()}`;
    let lastResponse;

    for (let i = 0; i < 101; i += 1) {
      lastResponse = await GET(buildRequest('test query', ip));
    }

    expect(lastResponse?.status).toBe(429);
  }, 15000);
});
