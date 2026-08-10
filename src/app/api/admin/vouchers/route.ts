import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { createVoucherSchema, listAdminVouchersQuerySchema } from '@/server/vouchers/schema';

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = listAdminVouchersQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { page, limit, q, channel, isActive } = parsed.data;

    const where: Prisma.VoucherWhereInput = {};

    if (channel) {
      where.channel = channel;
    }

    if (isActive) {
      where.isActive = isActive === 'true';
    }

    if (q) {
      where.code = { contains: q, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.voucher.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  },
  { role: 'ADMIN' },
);

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = createVoucherSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.type === 'FIXED' && data.maxDiscount != null) {
      return NextResponse.json(
        {
          error: 'Validasi gagal',
          issues: { maxDiscount: ['maxDiscount hanya untuk tipe PERCENT'] },
        },
        { status: 400 },
      );
    }

    if (data.type === 'PERCENT' && data.value > 100) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: { value: ['Persentase maksimal 100'] } },
        { status: 400 },
      );
    }

    if (data.startsAt && data.expiresAt && data.startsAt >= data.expiresAt) {
      return NextResponse.json(
        {
          error: 'Validasi gagal',
          issues: { expiresAt: ['Tanggal berakhir harus setelah tanggal mulai'] },
        },
        { status: 400 },
      );
    }

    try {
      const voucher = await prisma.voucher.create({
        data: { ...data, createdByUserId: user.id },
      });

      return NextResponse.json(voucher, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Validasi gagal', issues: { code: ['Kode voucher sudah digunakan'] } },
          { status: 409 },
        );
      }
      throw error;
    }
  },
  { role: 'ADMIN' },
);
