import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { ORDER_STATUSES, listAdminOrdersQuerySchema } from '@/server/orders/schema';

const MAX_EXPORT_ROWS = 10000;

const CSV_HEADERS = [
  'orderNumber',
  'createdAt',
  'status',
  'source',
  'receiverName',
  'receiverPhone',
  'receiverCity',
  'subtotal',
  'shippingCost',
  'total',
  'paymentMethod',
  'affiliateCode',
  'itemCount',
  'itemsSummary',
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
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { receiverName: { contains: q, mode: 'insensitive' } },
        { receiverPhone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ROWS,
      include: { items: { select: { titleSnapshot: true, quantity: true } } },
    });

    const rows = orders.map((order) => {
      const itemsSummary = order.items
        .map((item) => `${item.titleSnapshot} x${item.quantity}`)
        .join('; ');

      return toCsvRow([
        order.orderNumber,
        order.createdAt.toISOString(),
        order.status,
        order.source,
        order.receiverName,
        order.receiverPhone,
        order.receiverCity,
        order.subtotal,
        order.shippingCost,
        order.total,
        order.paymentMethod,
        order.affiliateCode ?? '',
        order.items.length,
        itemsSummary,
      ]);
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
