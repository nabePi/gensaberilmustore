import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/r/[code]/route';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/server/auth/password';

const createdEmails: string[] = [];
const createdProductIds: string[] = [];
const createdAffiliateProfileIds: string[] = [];

async function createAffiliateProfile(isActive = true) {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const passwordHash = await hashPassword('Password123');
  const user = await prisma.user.create({
    data: { email, passwordHash, name: 'Test User', role: 'AFFILIATE' },
  });
  const profile = await prisma.affiliateProfile.create({
    data: {
      userId: user.id,
      code: `AFF-${randomUUID()}`,
      payoutBankName: 'Bank',
      payoutBankAccount: '123',
      payoutBankHolder: 'Holder',
      isActive,
    },
  });
  createdAffiliateProfileIds.push(profile.id);
  return profile;
}

async function createProduct() {
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
    },
  });
  createdProductIds.push(product.id);
  return product;
}

function buildRequest(url: string) {
  return new NextRequest(url);
}

function context(code: string) {
  return { params: Promise.resolve({ code }) };
}

describe('GET /r/[code]', () => {
  afterAll(async () => {
    await prisma.affiliateClick.deleteMany({
      where: { affiliateProfileId: { in: createdAffiliateProfileIds } },
    });
    await prisma.affiliateProfile.deleteMany({ where: { id: { in: createdAffiliateProfileIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it('redirects to home without tracking when the code does not exist', async () => {
    const response = await GET(
      buildRequest('http://localhost/r/unknown-code'),
      context('unknown-code'),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/');
    expect(response.cookies.get('gsb_aff')).toBeUndefined();
  });

  it('redirects to home without tracking when the affiliate is inactive', async () => {
    const profile = await createAffiliateProfile(false);

    const response = await GET(
      buildRequest(`http://localhost/r/${profile.code}`),
      context(profile.code),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/');
    expect(response.cookies.get('gsb_aff')).toBeUndefined();
  });

  it('tracks the click, sets cookies, and redirects to the product page', async () => {
    const profile = await createAffiliateProfile();
    const product = await createProduct();

    const response = await GET(
      buildRequest(`http://localhost/r/${profile.code}?p=${product.slug}`),
      context(profile.code),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`http://localhost/products/${product.slug}`);
    expect(response.cookies.get('gsb_aff')?.value).toBe(profile.code);
    expect(response.cookies.get('gsb_cid')?.value).toBeTruthy();

    const click = await prisma.affiliateClick.findFirst({
      where: { affiliateProfileId: profile.id, productId: product.id },
    });
    expect(click).not.toBeNull();
  });

  it('redirects to home and tracks the click when no product slug is given', async () => {
    const profile = await createAffiliateProfile();

    const response = await GET(
      buildRequest(`http://localhost/r/${profile.code}`),
      context(profile.code),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/');
    expect(response.cookies.get('gsb_aff')?.value).toBe(profile.code);

    const click = await prisma.affiliateClick.findFirst({
      where: { affiliateProfileId: profile.id },
    });
    expect(click).not.toBeNull();
    expect(click?.productId).toBeNull();
  });
});
