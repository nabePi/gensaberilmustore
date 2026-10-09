import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { commissionRateUpsertSchema } from '@/server/affiliate/schema';
import { serializeCommissionRate } from '@/server/affiliate/serialize-rate';
import { withAuth } from '@/server/auth';

type RouteContext = { params: Promise<{ productId: string }> };

export const PUT = withAuth<RouteContext>(
  async (request: NextRequest, { params, user }) => {
    const { productId } = await params;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }
    if (product.channel === 'POS') {
      return NextResponse.json(
        { error: 'Produk khusus POS tidak bisa dijadikan produk afiliasi' },
        { status: 400 },
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = commissionRateUpsertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { commissionType, commissionValue, discountType, discountValue, startsAt, endsAt } =
      parsed.data;

    const data = {
      percent: commissionType === 'PERCENT' ? commissionValue : 0,
      fixedAmount: commissionType === 'FIXED' ? commissionValue : null,
      discountType,
      discountPercent: discountType === 'PERCENT' ? discountValue : null,
      discountAmount: discountType === 'FIXED' ? discountValue : null,
      startsAt,
      endsAt,
      isActive: parsed.data.isActive,
      updatedByUserId: user.id,
    };

    const rate = await prisma.affiliateCommissionRate.upsert({
      where: { productId },
      create: { productId, ...data },
      update: data,
    });

    return NextResponse.json(serializeCommissionRate(rate));
  },
  { role: 'ADMIN' },
);

export const DELETE = withAuth<RouteContext>(
  async (_request, { params }) => {
    const { productId } = await params;

    const result = await prisma.affiliateCommissionRate.deleteMany({ where: { productId } });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Produk afiliasi tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  },
  { role: 'ADMIN' },
);
