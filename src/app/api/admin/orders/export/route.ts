import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { parseRupiahAmount } from '@/lib/rupiah-amount';
import { withAuth } from '@/server/auth';
import { orderAmountFilter } from '@/server/orders/amount-filter';
import { ORDER_STATUSES, listAdminOrdersQuerySchema } from '@/server/orders/schema';

const MAX_EXPORT_ROWS = 10000;

const CSV_HEADERS = [
  'orderNumber',
  'createdAt',
  'status',
  'source',
  'receiverName',
  'receiverPhone',
  'destinationCity',
  'subtotal',
  'shippingCost',
  'total',
  'paymentMethod',
  'affiliateCode',
  'productId',
  'sku',
  'itemTitle',
  'quantity',
  'unitPrice',
  'discountPercent',
  'lineTotal',
];

function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsvRow(values: (string | number)[]): string {
  return values.map((value) => escapeCsvField(String(value))).join(',');
}

export const GET = withAuth(
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const parsed = listAdminOrdersQuerySchema
      .omit({ page: true, limit: true })
      .safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const statusValues = searchParams
      .getAll('status')
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean);

    const invalidStatus = statusValues.find(
      (value) => !ORDER_STATUSES.includes(value as (typeof ORDER_STATUSES)[number]),
    );
    if (invalidStatus) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: { status: [`Status tidak valid: ${invalidStatus}`] } },
        { status: 400 },
      );
    }

    const { q, source, dateFrom, dateTo, affiliateCode } = parsed.data;

    const where: Prisma.OrderWhereInput = {};

    if (statusValues.length > 0) {
      where.status = { in: statusValues as (typeof ORDER_STATUSES)[number][] };
    }
    if (source !== 'ALL') {
      where.source = source;
    }
    if (affiliateCode) {
      where.affiliateCode = affiliateCode;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }
    if (q) {
      const amount = parseRupiahAmount(q);
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { receiverName: { contains: q, mode: 'insensitive' } },
        { receiverPhone: { contains: q, mode: 'insensitive' } },
        ...(amount !== null ? [await orderAmountFilter(amount)] : []),
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ROWS,
      include: {
        items: {
          select: {
            productId: true,
            titleSnapshot: true,
            priceSnapshot: true,
            discountPercentSnapshot: true,
            quantity: true,
            lineTotal: true,
            product: { select: { sku: true } },
          },
        },
        destination: { select: { cityName: true } },
      },
    });

    // Satu baris per item. Info pesanan diulang di tiap baris agar mudah difilter,
    // tetapi nominal level pesanan hanya di baris pertama supaya SUM tidak dobel.
    const rows = orders.flatMap((order) => {
      const items = order.items.length > 0 ? order.items : [null];

      return items.map((item, index) => {
        const isFirstRow = index === 0;

        return toCsvRow([
          order.orderNumber,
          order.createdAt.toISOString(),
          order.status,
          order.source,
          order.receiverName,
          order.receiverPhone,
          order.destination?.cityName ?? '',
          isFirstRow ? order.subtotal : '',
          isFirstRow ? order.shippingCost : '',
          isFirstRow ? order.total : '',
          order.paymentMethod,
          order.affiliateCode ?? '',
          item?.productId ?? '',
          item?.product?.sku ?? '',
          item?.titleSnapshot ?? '',
          item?.quantity ?? '',
          item?.priceSnapshot ?? '',
          item?.discountPercentSnapshot ?? '',
          item?.lineTotal ?? '',
        ]);
      });
    });

    const csv = [toCsvRow(CSV_HEADERS), ...rows].join('\r\n');
    const date = new Date().toISOString().slice(0, 10);
    const BOM = '\uFEFF';

    return new NextResponse(`${BOM}${csv}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-${date}.csv"`,
      },
    });
  },
  { role: 'ADMIN' },
);
