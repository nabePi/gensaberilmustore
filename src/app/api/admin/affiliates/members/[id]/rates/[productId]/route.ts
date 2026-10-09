import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { memberCommissionSchema } from '@/server/affiliate/schema';
import { withAuth } from '@/server/auth';

type RouteContext = { params: Promise<{ id: string; productId: string }> };

/** Set a commission just for this member on this product (overrides the product rate). */
export const PUT = withAuth<RouteContext>(
  async (request: NextRequest, { params, user }) => {
    const { id, productId } = await params;

    const body: unknown = await request.json().catch(() => null);
    const parsed = memberCommissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validasi gagal' },
        { status: 400 },
      );
    }

    const [profile, product] = await Promise.all([
      prisma.affiliateProfile.findUnique({ where: { id }, select: { id: true } }),
      prisma.product.findUnique({ where: { id: productId }, select: { id: true } }),
    ]);
    if (!profile || !product) {
      return NextResponse.json({ error: 'Member atau produk tidak ditemukan' }, { status: 404 });
    }

    const { commissionType, commissionValue } = parsed.data;
    const data = {
      percent: commissionType === 'PERCENT' ? commissionValue : null,
      fixedAmount: commissionType === 'FIXED' ? commissionValue : null,
      updatedByUserId: user.id,
    };
    const saved = await prisma.affiliateMemberRate.upsert({
      where: { affiliateProfileId_productId: { affiliateProfileId: id, productId } },
      create: { affiliateProfileId: id, productId, ...data },
      update: data,
    });

    return NextResponse.json({
      productId,
      commissionType,
      commissionValue,
      updatedAt: saved.updatedAt,
    });
  },
  { role: 'ADMIN' },
);

/** Remove the custom commission so the member falls back to the product rate. */
export const DELETE = withAuth<RouteContext>(
  async (_request, { params }) => {
    const { id, productId } = await params;
    await prisma.affiliateMemberRate.deleteMany({
      where: { affiliateProfileId: id, productId },
    });
    return NextResponse.json({ success: true });
  },
  { role: 'ADMIN' },
);
