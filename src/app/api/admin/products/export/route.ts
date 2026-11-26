import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { adminProductFilterSchema, buildAdminProductWhere } from '@/server/products/admin-filter';
import { buildCsvResponse } from '@/server/reports/csv';

const MAX_EXPORT_ROWS = 20000;

const CHANNEL_LABELS = { WEB: 'Website', POS: 'POS', BOTH: 'Website & POS' } as const;

const CSV_HEADERS = [
  'Product ID',
  'SKU',
  'ISBN',
  'Judul',
  'Subjudul',
  'Penulis',
  'Penerbit',
  'Kategori',
  'Tag',
  'Harga',
  'Harga Modal',
  'Harga Pre-Order',
  'Pre-Order Aktif',
  'Harga Grosir',
  'Min Qty Grosir',
  'Diskon (%)',
  'Harga Diskon',
  'Diskon Berakhir',
  'Harga Akhir',
  'Stok',
  'Berat (gram)',
  'Jenis Cover',
  'Jumlah Halaman',
  'Tahun Terbit',
  'Status',
  'Channel',
  'Pita',
  'Teks Pita',
  'Slug',
  'Dibuat',
  'Diperbarui',
];

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = adminProductFilterSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const products = await prisma.product.findMany({
      where: buildAdminProductWhere(parsed.data),
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ROWS,
      include: {
        categories: { select: { category: { select: { name: true } } } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    });

    const rows = products.map((product) => [
      product.id,
      product.sku,
      product.isbn ?? '',
      product.title,
      product.subtitle,
      product.author,
      product.imprint ?? '',
      product.categories.map(({ category }) => category.name).join('; '),
      product.tags.map(({ tag }) => tag.name).join('; '),
      product.price,
      product.costPrice ?? '',
      product.preOrderPrice ?? '',
      product.isPreOrderActive ? 'Ya' : 'Tidak',
      product.wholesalePrice ?? '',
      product.wholesaleMinQty ?? '',
      product.discountPercent,
      product.discountPrice ?? '',
      product.discountEndDate?.toISOString() ?? '',
      product.finalPrice,
      product.stock,
      product.weightGram,
      product.coverType,
      product.pageCount,
      product.publishYear,
      product.isActive ? 'Aktif' : 'Nonaktif',
      CHANNEL_LABELS[product.channel],
      product.ribbonType ?? '',
      product.ribbonText ?? '',
      product.slug,
      product.createdAt.toISOString(),
      product.updatedAt.toISOString(),
    ]);

    const date = new Date().toISOString().slice(0, 10);
    return buildCsvResponse(`export_produk_${date}.csv`, CSV_HEADERS, rows);
  },
  { role: 'ADMIN' },
);
