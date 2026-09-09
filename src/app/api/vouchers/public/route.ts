import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { getSession } from '@/server/auth';
import { listPublicVouchersQuerySchema } from '@/server/vouchers/schema';
import { computeVoucherDiscount } from '@/server/vouchers/validate';

export async function GET(request: NextRequest) {
  const parsed = listPublicVouchersQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { subtotal, channel } = parsed.data;
  const user = await getSession(request);
  const now = new Date();

  const vouchers = await prisma.voucher.findMany({
    where: {
      visibility: 'PUBLIC',
      isActive: true,
      channel: { in: ['ALL', channel] },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  const eligible = [];
  for (const voucher of vouchers) {
    if (voucher.quota !== null && voucher.usedCount >= voucher.quota) continue;
    if (user && voucher.perUserLimit !== null) {
      const redemptionCount = await prisma.voucherRedemption.count({
        where: { voucherId: voucher.id, userId: user.id },
      });
      if (redemptionCount >= voucher.perUserLimit) continue;
    }
    eligible.push(voucher);
  }

  return NextResponse.json({
    items: eligible.map((voucher) => ({
      id: voucher.id,
      code: voucher.code,
      description: voucher.description,
      type: voucher.type,
      value: voucher.value,
      maxDiscount: voucher.maxDiscount,
      minPurchase: voucher.minPurchase,
      eligible: subtotal >= voucher.minPurchase,
      discountAmount:
        subtotal >= voucher.minPurchase ? computeVoucherDiscount(voucher, subtotal) : 0,
    })),
  });
}
