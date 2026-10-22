import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveCart, tariff, affiliate, destination } = vi.hoisted(() => ({
  resolveCart: vi.fn(),
  tariff: vi.fn(),
  affiliate: vi.fn(),
  destination: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ prisma: { destination: { findUnique: destination } } }));
vi.mock('@/server/cart/cart', async (original) => {
  const actual = await original<typeof import('@/server/cart/cart')>();
  return { ...actual, resolveCart };
});
vi.mock('@/server/shipping/jne-tariff', () => ({
  fetchJneTariffOptions: tariff,
  isAllowedJneService: () => true,
  JneTariffError: class extends Error {},
}));
vi.mock('@/server/affiliate/rate', () => ({ computeAffiliateDiscount: affiliate }));
const { POST: shipping } = await import('@/app/api/shipping/tariff/route');
const { GET: discount } = await import('@/app/api/affiliate/discount/route');
const destinationId = '45ad789d-e45f-4dfa-908b-dbddfa603018';
const cart = {
  items: [
    {
      id: 'ready',
      productId: 'r',
      quantity: 2,
      priceSnapshot: 100000,
      product: { isPreOrderActive: false, weightGram: 200 },
    },
    {
      id: 'po',
      productId: 'p',
      quantity: 3,
      priceSnapshot: 90000,
      product: { isPreOrderActive: true, weightGram: 2000 },
    },
  ],
};
beforeEach(() => {
  vi.resetAllMocks();
  resolveCart.mockResolvedValue({ cart });
  destination.mockResolvedValue({ tariffCode: 'JKT' });
  tariff.mockResolvedValue([]);
  affiliate.mockResolvedValue(10000);
});
describe('group-specific checkout previews', () => {
  it.each([
    ['READY', 1],
    ['PRE_ORDER', 6],
  ] as const)('calculates shipping weight only for %s', async (checkoutGroup, weight) => {
    const response = await shipping(
      new NextRequest('http://localhost/api/shipping/tariff', {
        method: 'POST',
        body: JSON.stringify({ destinationId, checkoutGroup }),
      }),
    );
    expect(response.status).toBe(200);
    expect(tariff).toHaveBeenCalledWith('JKT', weight);
  });
  it('requires a group for shipping a mixed cart', async () => {
    const response = await shipping(
      new NextRequest('http://localhost/api/shipping/tariff', {
        method: 'POST',
        body: JSON.stringify({ destinationId }),
      }),
    );
    expect(response.status).toBe(400);
    expect(tariff).not.toHaveBeenCalled();
  });
  it.each([
    ['READY', 'r', 200000],
    ['PRE_ORDER', 'p', 270000],
  ] as const)('previews affiliate discounts only for %s', async (group, productId, lineTotal) => {
    const response = await discount(
      new NextRequest(`http://localhost/api/affiliate/discount?checkoutGroup=${group}`, {
        headers: { cookie: 'gsb_aff=AFF-TEST' },
      }),
    );
    expect(response.status).toBe(200);
    expect(affiliate.mock.calls[0]?.[2]).toEqual([
      { productId, quantity: group === 'READY' ? 2 : 3, lineTotal },
    ]);
  });
  it('does not preview a combined affiliate discount for a mixed cart', async () => {
    const response = await discount(
      new NextRequest('http://localhost/api/affiliate/discount', {
        headers: { cookie: 'gsb_aff=AFF-TEST' },
      }),
    );
    expect(response.status).toBe(400);
    expect(affiliate).not.toHaveBeenCalled();
  });
});
