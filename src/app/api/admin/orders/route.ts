import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { ORDER_STATUSES, listAdminOrdersQuerySchema } from '@/server/orders/schema';
import { orderListInclude, serializeAdminOrderListItem } from '@/server/orders/serialize';

export const GET = withAuth(
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const parsed = listAdminOrdersQuerySchema.safeParse(Object.fromEntries(searchParams));

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

    const { page, limit, q, source, dateFrom, dateTo, affiliateCode } = parsed.data;

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

    const [items, total, aggregate] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: orderListInclude,
      }),
      prisma.order.count({ where }),
      prisma.order.aggregate({ where, _sum: { total: true } }),
    ]);

    return NextResponse.json({
      items: items.map(serializeAdminOrderListItem),
      total,
      page,
      limit,
      aggregates: {
        totalRevenue: aggregate._sum.total ?? 0,
        totalOrders: total,
      },
    });
  },
  { role: 'ADMIN' },
);
