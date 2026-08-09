import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { listAdminAffiliatesQuerySchema } from '@/server/affiliate/schema';
import { withAuth } from '@/server/auth';

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = listAdminAffiliatesQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { page, limit, q } = parsed.data;

    const where: Prisma.AffiliateProfileWhereInput = q
      ? {
          user: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        }
      : {};

    const [profiles, total] = await Promise.all([
      prisma.affiliateProfile.findMany({
        where,
        orderBy: { joinedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { clicks: true, conversions: true } },
          conversions: { select: { commissionAmount: true, status: true } },
        },
      }),
      prisma.affiliateProfile.count({ where }),
    ]);

    return NextResponse.json({
      items: profiles.map(({ conversions, _count, ...profile }) => ({
        id: profile.id,
        code: profile.code,
        isActive: profile.isActive,
        joinedAt: profile.joinedAt,
        user: profile.user,
        totalClicks: _count.clicks,
        totalConversions: _count.conversions,
        commissionPending: conversions
          .filter((c) => c.status === 'PENDING' || c.status === 'APPROVED')
          .reduce((sum, c) => sum + c.commissionAmount, 0),
        commissionPaid: conversions
          .filter((c) => c.status === 'PAID')
          .reduce((sum, c) => sum + c.commissionAmount, 0),
      })),
      total,
      page,
      limit,
    });
  },
  { role: 'ADMIN' },
);
