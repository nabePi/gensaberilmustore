import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { homepageSectionDetailUpdateSchema } from '@/server/config/schema';
import { minFixedPrice, percentFromFixedPrice } from '@/server/products/pricing';

type RouteContext = { params: Promise<{ id: string }> };

function toDateInput(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

async function getSectionDetail(id: string) {
  const section = await prisma.homepageSection.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { position: 'asc' },
        select: {
          productId: true,
          position: true,
          product: {
            select: {
              title: true,
              sku: true,
              price: true,
              discountPercent: true,
              discountPrice: true,
              discountEndDate: true,
              images: {
                orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
                take: 1,
                select: { url: true },
              },
            },
          },
        },
      },
    },
  });

  if (!section) return null;

  const { products, ...rest } = section;

  return {
    ...rest,
    products: products.map((p) => ({
      productId: p.productId,
      title: p.product.title,
      sku: p.product.sku,
      price: p.product.price,
      discountType: p.product.discountPrice != null ? 'FIXED' : 'PERCENT',
      primaryImageUrl: p.product.images[0]?.url ?? null,
      discountPercent: p.product.discountPercent,
      discountPrice: p.product.discountPrice,
      discountEndDate: toDateInput(p.product.discountEndDate),
    })),
  };
}

export const GET = withAuth<RouteContext>(
  async (_request: NextRequest, { params }) => {
    const { id } = await params;
    const section = await getSectionDetail(id);
    if (!section) {
      return NextResponse.json({ error: 'Section tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(section);
  },
  { role: 'ADMIN' },
);

export const PUT = withAuth<RouteContext>(
  async (request: NextRequest, { params }) => {
    const { id } = await params;

    const existing = await prisma.homepageSection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Section tidak ditemukan' }, { status: 404 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = homepageSectionDetailUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { products, ...sectionData } = parsed.data;

    const productPrices = new Map<string, number>();
    if (products.length > 0) {
      const found = await prisma.product.findMany({
        where: { id: { in: products.map((p) => p.productId) } },
        select: { id: true, price: true },
      });
      if (found.length !== products.length) {
        return NextResponse.json(
          { error: 'Validasi gagal', issues: { products: ['Beberapa produk tidak ditemukan'] } },
          { status: 400 },
        );
      }
      for (const row of found) productPrices.set(row.id, row.price);
    }

    if (sectionData.type === 'PROMO') {
      const fixedPriceIssues: string[] = [];
      for (const product of products) {
        if (product.discountType !== 'FIXED') continue;
        const price = productPrices.get(product.productId)!;
        const fixedPrice = product.discountPrice!;
        if (fixedPrice >= price) {
          fixedPriceIssues.push('Harga promo harus lebih kecil dari harga normal');
        } else if (fixedPrice < minFixedPrice(price)) {
          fixedPriceIssues.push('Harga promo maksimal diskon 90% dari harga normal');
        }
      }
      if (fixedPriceIssues.length > 0) {
        return NextResponse.json(
          { error: 'Validasi gagal', issues: { products: [...new Set(fixedPriceIssues)] } },
          { status: 400 },
        );
      }
    }

    if (sectionData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: sectionData.categoryId },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json(
          { error: 'Validasi gagal', issues: { categoryId: ['Kategori tidak ditemukan'] } },
          { status: 400 },
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.homepageSection.update({
        where: { id },
        data: {
          title: sectionData.title,
          subtitle: sectionData.subtitle,
          promoImageUrl: sectionData.promoImageUrl ?? '',
          isEnabled: sectionData.isEnabled,
          backgroundColor: sectionData.backgroundColor || null,
          titleColor: sectionData.titleColor || null,
          type: sectionData.type,
          categoryId: sectionData.categoryId || null,
        },
      });

      await tx.homepageSectionProduct.deleteMany({ where: { sectionId: id } });

      if (products.length > 0) {
        await tx.homepageSectionProduct.createMany({
          data: products.map((product, position) => ({
            sectionId: id,
            productId: product.productId,
            position,
          })),
        });
      }

      // Product is the source of truth for the discount: a PROMO section save writes
      // discountPercent/discountEndDate directly onto Product. REGULAR sections never
      // touch Product rows, and removing a product from a PROMO section does not clear
      // its discount - the discount belongs to the product independent of curation.
      if (sectionData.type === 'PROMO') {
        for (const product of products) {
          // A fixed price is stored as-is; discountPercent keeps the derived percent so
          // badges and order snapshots stay meaningful.
          const isFixed = product.discountType === 'FIXED';
          await tx.product.update({
            where: { id: product.productId },
            data: {
              discountPercent: isFixed
                ? percentFromFixedPrice(
                    productPrices.get(product.productId)!,
                    product.discountPrice!,
                  )
                : product.discountPercent,
              discountPrice: isFixed ? product.discountPrice : null,
              discountEndDate: new Date(`${product.discountEndDate}T23:59:59.999`),
            },
          });
        }
      }
    });

    const refreshed = await getSectionDetail(id);
    return NextResponse.json(refreshed);
  },
  { role: 'ADMIN' },
);
