import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { createPayoutBatchSchema, listAdminPayoutsQuerySchema } from '@/server/affiliate/schema';
import { withAuth } from '@/server/auth';

class PayoutCreationError extends Error {}

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = listAdminPayoutsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { page, limit, status, affiliateProfileId } = parsed.data;

    const where: Prisma.AffiliatePayoutWhereInput = {
      ...(status ? { status } : {}),
      ...(affiliateProfileId ? { affiliateProfileId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.affiliatePayout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          affiliateProfile: {
            select: { code: true, user: { select: { name: true, email: true } } },
          },
        },
      }),
      prisma.affiliatePayout.count({ where }),
    ]);

    return NextResponse.json({
      items: items.map((payout) => ({
        id: payout.id,
        affiliateProfileId: payout.affiliateProfileId,
        affiliate: {
          code: payout.affiliateProfile.code,
          name: payout.affiliateProfile.user.name,
          email: payout.affiliateProfile.user.email,
        },
        periodStart: payout.periodStart,
        periodEnd: payout.periodEnd,
        totalAmount: payout.totalAmount,
        status: payout.status,
        paidAt: payout.paidAt,
        notes: payout.notes,
        createdAt: payout.createdAt,
      })),
      total,
      page,
      limit,
    });
  },
  { role: 'ADMIN' },
);

export const POST = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = createPayoutBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { affiliateProfileId, periodStart, periodEnd } = parsed.data;

    const affiliateProfile = await prisma.affiliateProfile.findUnique({
      where: { id: affiliateProfileId },
    });
    if (!affiliateProfile) {
      return NextResponse.json({ error: 'Afiliasi tidak ditemukan' }, { status: 404 });
    }

    try {
      const payout = await prisma.$transaction(async (tx) => {
        const conversions = await tx.affiliateConversion.findMany({
          where: {
            affiliateProfileId,
            status: 'APPROVED',
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        });

        if (conversions.length === 0) {
          throw new PayoutCreationError('Tidak ada komisi APPROVED pada periode ini');
        }

        const totalAmount = conversions.reduce((sum, c) => sum + c.commissionAmount, 0);

        const created = await tx.affiliatePayout.create({
          data: { affiliateProfileId, periodStart, periodEnd, totalAmount, status: 'PENDING' },
        });

        await tx.affiliateConversion.updateMany({
          where: { id: { in: conversions.map((c) => c.id) } },
          data: { status: 'PAID', paidAt: new Date() },
        });

        return created;
      });

      return NextResponse.json(payout, { status: 201 });
    } catch (error) {
      if (error instanceof PayoutCreationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  },
  { role: 'ADMIN' },
);
