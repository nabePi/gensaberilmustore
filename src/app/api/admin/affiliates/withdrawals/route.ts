import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { listAdminWithdrawalsQuerySchema } from '@/server/affiliate/withdrawal';
import { withAuth } from '@/server/auth';

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = listAdminWithdrawalsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal' }, { status: 400 });
    }

    const items = await prisma.affiliateWithdrawal.findMany({
      where: parsed.data.status ? { status: parsed.data.status } : {},
      orderBy: { requestedAt: 'desc' },
      take: 200,
      include: {
        affiliateProfile: {
          select: { code: true, user: { select: { name: true, email: true, phone: true } } },
        },
      },
    });

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        amount: item.amount,
        status: item.status,
        requestedAt: item.requestedAt,
        completedAt: item.completedAt,
        bank: { name: item.bankName, account: item.bankAccount, holder: item.bankHolder },
        affiliate: {
          code: item.affiliateProfile.code,
          name: item.affiliateProfile.user.name,
          email: item.affiliateProfile.user.email,
          phone: item.affiliateProfile.user.phone,
        },
      })),
    });
  },
  { role: 'ADMIN' },
);
