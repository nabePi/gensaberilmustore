import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { listAdminAffiliateMembersQuerySchema } from '@/server/affiliate/schema';
import { withAuth } from '@/server/auth';

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = listAdminAffiliateMembersQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { page, limit, q, status, active, sort, order } = parsed.data;

    const where: Prisma.AffiliateProfileWhereInput = {
      ...(status ? { status } : {}),
      ...(active ? { isActive: active === 'true' } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { user: { name: { contains: q, mode: 'insensitive' } } },
              { user: { email: { contains: q, mode: 'insensitive' } } },
              { user: { phone: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.AffiliateProfileOrderByWithRelationInput[] =
      sort === 'name' || sort === 'email'
        ? [{ user: { [sort]: order } }, { id: 'asc' }]
        : [{ [sort]: order }, { id: 'asc' }];

    const [profiles, total] = await Promise.all([
      prisma.affiliateProfile.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      }),
      prisma.affiliateProfile.count({ where }),
    ]);

    return NextResponse.json({
      items: profiles.map((profile) => ({
        id: profile.id,
        code: profile.code,
        status: profile.status,
        isActive: profile.isActive,
        joinedAt: profile.joinedAt,
        payoutBankName: profile.payoutBankName,
        payoutBankAccount: profile.payoutBankAccount,
        payoutBankHolder: profile.payoutBankHolder,
        user: profile.user,
      })),
      total,
      page,
      limit,
    });
  },
  { role: 'ADMIN' },
);
