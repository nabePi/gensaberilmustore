import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { loadItemCommissions } from '@/server/affiliate/item-commission';
import { serializeCommissionRate } from '@/server/affiliate/serialize-rate';
import { withAuth } from '@/server/auth';

type RouteContext = { params: Promise<{ productId: string }> };

const DAYS = 30;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function dayKey(date: Date) {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

export const GET = withAuth<RouteContext>(async (_request, { params, user }) => {
  const { productId } = await params;

  const profile = await prisma.affiliateProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return NextResponse.json({ error: 'Anda belum menjadi afiliasi' }, { status: 404 });
  }

  const selection = await prisma.affiliateProductSelection.findUnique({
    where: { affiliateProfileId_productId: { affiliateProfileId: profile.id, productId } },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          finalPrice: true,
          commissionRate: true,
          images: {
            orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  });
  if (!selection) {
    return NextResponse.json(
      { error: 'Produk tidak ada di pilihan afiliasi Anda' },
      { status: 404 },
    );
  }

  const since = new Date(Date.now() - (DAYS - 1) * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const [totalClicks, recentClicks, items, memberRate] = await Promise.all([
    prisma.affiliateClick.count({ where: { affiliateProfileId: profile.id, productId } }),
    prisma.affiliateClick.findMany({
      where: { affiliateProfileId: profile.id, productId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    loadItemCommissions(prisma, { id: profile.id, userId: user.id }, { productId }),
    prisma.affiliateMemberRate.findUnique({
      where: { affiliateProfileId_productId: { affiliateProfileId: profile.id, productId } },
    }),
  ]);

  const productRate = selection.product.commissionRate;

  const orders = {
    total: items.length,
    awaitingPayment: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
  };
  let unitsSold = 0;
  let salesValue = 0;
  let commissionPending = 0;
  let commissionEarned = 0;
  let commissionPaid = 0;

  const recentOrders = items.map((item) => {
    // Recorded commission of the order, so later rate changes do not rewrite past orders.
    const { conversionStatus, commission } = item;

    if (item.orderStatus === 'AWAITING_PAYMENT') orders.awaitingPayment += 1;
    else if (item.orderStatus === 'CANCELLED') orders.cancelled += 1;
    else if (item.orderStatus === 'COMPLETED') orders.completed += 1;
    else orders.processing += 1;

    if (conversionStatus === 'APPROVED' || conversionStatus === 'PAID') {
      unitsSold += item.quantity;
      salesValue += item.lineTotal;
    }
    if (conversionStatus === 'PENDING') commissionPending += commission;
    if (conversionStatus === 'APPROVED') commissionEarned += commission;
    if (conversionStatus === 'PAID') commissionPaid += commission;

    return {
      orderNumber: item.orderNumber,
      createdAt: item.createdAt,
      orderStatus: item.orderStatus,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      commission,
    };
  });

  const daily = new Map<string, { clicks: number; orders: number }>();
  for (let i = 0; i < DAYS; i += 1) {
    daily.set(dayKey(new Date(since.getTime() + i * 24 * 60 * 60 * 1000)), {
      clicks: 0,
      orders: 0,
    });
  }
  for (const click of recentClicks) {
    const bucket = daily.get(dayKey(click.createdAt));
    if (bucket) bucket.clicks += 1;
  }
  for (const item of items) {
    const bucket = daily.get(dayKey(item.createdAt));
    if (bucket) bucket.orders += 1;
  }

  const { product } = selection;
  const serializedRate = productRate ? serializeCommissionRate(productRate) : null;
  const commissionView = memberRate
    ? memberRate.fixedAmount !== null
      ? { type: 'FIXED', value: memberRate.fixedAmount }
      : { type: 'PERCENT', value: Number(memberRate.percent) }
    : serializedRate && {
        type: serializedRate.commissionType,
        value: serializedRate.commissionValue,
      };

  return NextResponse.json({
    product: {
      id: product.id,
      title: product.title,
      slug: product.slug,
      finalPrice: product.finalPrice,
      imageUrl: product.images[0]?.url ?? null,
      commission: commissionView,
      buyerDiscount:
        serializedRate?.discountType && serializedRate.discountValue !== null
          ? { type: serializedRate.discountType, value: serializedRate.discountValue }
          : null,
      rateStatus: serializedRate?.status ?? null,
    },
    totals: {
      clicks: totalClicks,
      orders,
      unitsSold,
      salesValue,
      commissionPending,
      commissionEarned,
      commissionPaid,
    },
    daily: [...daily.entries()].map(([date, value]) => ({ date, ...value })),
    recentOrders: recentOrders.slice(0, 20),
  });
});
