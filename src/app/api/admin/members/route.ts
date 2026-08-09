import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';

const listAdminMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  q: z.string().trim().min(1).optional(),
});

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = listAdminMembersQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { page, limit, q } = parsed.data;

    const where = {
      role: { not: 'ADMIN' as const },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          orders: { select: { total: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      items: members.map(({ orders, ...member }) => ({
        ...member,
        orderCount: orders.length,
        totalSpend: orders.reduce((sum, order) => sum + order.total, 0),
      })),
      total,
      page,
      limit,
    });
  },
  { role: 'ADMIN' },
);
