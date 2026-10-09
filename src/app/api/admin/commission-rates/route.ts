import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import {
  bulkDeleteCommissionRatesSchema,
  listAdminCommissionRatesQuerySchema,
} from '@/server/affiliate/schema';
import { serializeCommissionRate } from '@/server/affiliate/serialize-rate';
import { withAuth } from '@/server/auth';

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = listAdminCommissionRatesQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { q, page, limit } = parsed.data;

    const where: Prisma.AffiliateCommissionRateWhereInput = q
      ? {
          product: {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
            ],
          },
        }
      : {};

    const [rates, total] = await Promise.all([
      prisma.affiliateCommissionRate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        include: {
          product: {
            select: {
              id: true,
              title: true,
              sku: true,
              finalPrice: true,
              channel: true,
              images: {
                orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
                take: 1,
                select: { url: true },
              },
            },
          },
        },
      }),
      prisma.affiliateCommissionRate.count({ where }),
    ]);

    return NextResponse.json({
      items: rates.map((rate) => ({
        ...serializeCommissionRate(rate),
        title: rate.product.title,
        sku: rate.product.sku,
        finalPrice: rate.product.finalPrice,
        channel: rate.product.channel,
        primaryImageUrl: rate.product.images[0]?.url ?? null,
      })),
      total,
      page,
      limit,
    });
  },
  { role: 'ADMIN' },
);

export const DELETE = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = bulkDeleteCommissionRatesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const result = await prisma.affiliateCommissionRate.deleteMany({
      where: { productId: { in: parsed.data.productIds } },
    });

    return NextResponse.json({ deleted: result.count });
  },
  { role: 'ADMIN' },
);
