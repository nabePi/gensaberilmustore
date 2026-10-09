import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { listAffiliateCandidatesQuerySchema } from '@/server/affiliate/schema';
import { withAuth } from '@/server/auth';

/** Products that can still be added to the affiliate program: active and shown on the website. */
export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = listAffiliateCandidatesQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal' }, { status: 400 });
    }
    const { q, page, limit } = parsed.data;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      channel: { in: ['WEB', 'BOTH'] },
      commissionRate: null,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { author: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ title: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          sku: true,
          author: true,
          finalPrice: true,
          channel: true,
          images: {
            orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            take: 1,
            select: { url: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      items: products.map(({ images, ...product }) => ({
        ...product,
        primaryImageUrl: images[0]?.url ?? null,
      })),
      total,
      page,
      limit,
    });
  },
  { role: 'ADMIN' },
);
