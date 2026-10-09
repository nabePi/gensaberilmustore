import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { promotableProductWhere } from '@/server/affiliate/rate';
import { affiliateProductSelectionSchema } from '@/server/affiliate/schema';
import { serializeCommissionRate } from '@/server/affiliate/serialize-rate';
import { withAuth } from '@/server/auth';

const thumbnailImageInclude = {
  orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
  take: 1,
  select: { url: true },
} satisfies Prisma.ProductImageFindManyArgs;

async function requireAffiliateProfile(userId: string) {
  return prisma.affiliateProfile.findUnique({ where: { userId } });
}

export const GET = withAuth(async (request: NextRequest, { user }) => {
  const profile = await requireAffiliateProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Anda belum menjadi afiliasi' }, { status: 404 });
  }
  if (profile.status !== 'APPROVED') {
    return NextResponse.json(
      { error: 'Pendaftaran afiliasi Anda masih menunggu persetujuan admin' },
      { status: 403 },
    );
  }

  const q = request.nextUrl.searchParams.get('q')?.trim();

  const [products, selections] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...promotableProductWhere(),
        ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        finalPrice: true,
        images: thumbnailImageInclude,
        commissionRate: true,
      },
      orderBy: { title: 'asc' },
    }),
    prisma.affiliateProductSelection.findMany({
      where: { affiliateProfileId: profile.id },
      select: { productId: true },
    }),
  ]);

  const selectedIds = new Set(selections.map((selection) => selection.productId));

  return NextResponse.json({
    items: products.map((product) => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      finalPrice: product.finalPrice,
      imageUrl: product.images[0]?.url ?? null,
      commissionRate: product.commissionRate
        ? (({ commissionType, commissionValue, discountType, discountValue, endsAt }) => ({
            commissionType,
            commissionValue,
            discountType,
            discountValue,
            endsAt,
          }))(serializeCommissionRate(product.commissionRate))
        : null,
      isSelected: selectedIds.has(product.id),
    })),
  });
});

export const PUT = withAuth(async (request: NextRequest, { user }) => {
  const profile = await requireAffiliateProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Anda belum menjadi afiliasi' }, { status: 404 });
  }
  if (profile.status !== 'APPROVED') {
    return NextResponse.json(
      { error: 'Pendaftaran afiliasi Anda masih menunggu persetujuan admin' },
      { status: 403 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = affiliateProductSelectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Only products the admin currently offers can be picked. Selections of products that are
  // temporarily outside the program (paused or scheduled) are left untouched.
  const promotable = await prisma.product.findMany({
    where: promotableProductWhere(),
    select: { id: true },
  });
  const promotableIds = new Set(promotable.map((product) => product.id));
  const productIds = parsed.data.productIds.filter((productId) => promotableIds.has(productId));

  await prisma.$transaction(async (tx) => {
    await tx.affiliateProductSelection.deleteMany({
      where: { affiliateProfileId: profile.id, productId: { in: [...promotableIds] } },
    });

    if (productIds.length > 0) {
      await tx.affiliateProductSelection.createMany({
        data: productIds.map((productId) => ({
          affiliateProfileId: profile.id,
          productId,
        })),
        skipDuplicates: true,
      });
    }
  });

  return NextResponse.json({ success: true });
});

export const POST = PUT;
