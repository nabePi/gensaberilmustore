import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import {
  NEXT_WITHDRAWAL_STATUS,
  updateWithdrawalStatusSchema,
} from '@/server/affiliate/withdrawal';
import { withAuth } from '@/server/auth';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAuth<RouteContext>(
  async (request: NextRequest, { params }) => {
    const { id } = await params;

    const body: unknown = await request.json().catch(() => null);
    const parsed = updateWithdrawalStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }
    const { status } = parsed.data;

    const withdrawal = await prisma.affiliateWithdrawal.findUnique({ where: { id } });
    if (!withdrawal) {
      return NextResponse.json({ error: 'Pencairan tidak ditemukan' }, { status: 404 });
    }
    if (withdrawal.status === 'COMPLETED' || NEXT_WITHDRAWAL_STATUS[withdrawal.status] !== status) {
      return NextResponse.json(
        { error: 'Perubahan status tidak diizinkan dari status saat ini' },
        { status: 400 },
      );
    }

    // Conditional on the status we just read so a concurrent change cannot be overwritten.
    const result = await prisma.affiliateWithdrawal.updateMany({
      where: { id, status: withdrawal.status },
      data: { status, ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}) },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Status pencairan baru saja berubah, muat ulang halaman' },
        { status: 409 },
      );
    }

    return NextResponse.json(await prisma.affiliateWithdrawal.findUnique({ where: { id } }));
  },
  { role: 'ADMIN' },
);
