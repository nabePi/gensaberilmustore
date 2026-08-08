import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/shipping/cities/route';
import { prisma } from '@/lib/db';

const createdCityIds: string[] = [];

async function createCity(
  overrides: Partial<Parameters<typeof prisma.city.create>[0]['data']> = {},
) {
  const city = await prisma.city.create({
    data: {
      name: `Test City ${randomUUID()}`,
      province: 'Test Province',
      shippingCost: 20000,
      isActive: true,
      ...overrides,
    },
  });
  createdCityIds.push(city.id);
  return city;
}

function buildRequest(query = '') {
  return new NextRequest(`http://localhost/api/shipping/cities${query}`, { method: 'GET' });
}

describe('GET /api/shipping/cities', () => {
  afterAll(async () => {
    await prisma.city.deleteMany({ where: { id: { in: createdCityIds } } });
  });

  it('returns active cities with id, name, province, and shippingCost', async () => {
    const city = await createCity();

    const response = await GET(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    const match = json.items.find((item: { id: string }) => item.id === city.id);
    expect(match).toEqual({
      id: city.id,
      name: city.name,
      province: city.province,
      shippingCost: city.shippingCost,
    });
  });

  it('excludes inactive cities', async () => {
    const city = await createCity({ isActive: false });

    const response = await GET(buildRequest());
    const json = await response.json();

    expect(json.items.some((item: { id: string }) => item.id === city.id)).toBe(false);
  });

  it('filters by partial name search', async () => {
    const marker = randomUUID();
    const city = await createCity({ name: `Unique-${marker}` });

    const response = await GET(buildRequest(`?q=${marker}`));
    const json = await response.json();

    expect(json.items).toHaveLength(1);
    expect(json.items[0].id).toBe(city.id);
  });

  it('sets a 5 minute cache-control header', async () => {
    const response = await GET(buildRequest());
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
  });
});
