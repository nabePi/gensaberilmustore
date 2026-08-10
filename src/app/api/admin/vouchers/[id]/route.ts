import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { updateVoucherSchema } from '@/server/vouchers/schema';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteContext>(
  async (_request: NextRequest, { params }) => {
    const { id } = await params;

    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) {
      return NextResponse.json({ error: 'Voucher tidak ditemukan' }, { status: 404 });
    }

    const [redemptionCount, totalDiscount] = await Promise.all([
      prisma.voucherRedemption.count({ where: { voucherId: id } }),
      prisma.voucherRedemption.aggregate({
        where: { voucherId: id },
        _sum: { discountAmount: true },
      }),
    ]);

    return NextResponse.json({
      ...voucher,
      stats: {
        redemptionCount,
        totalDiscount: totalDiscount._sum.discountAmount ?? 0,
      },
    });
  },
  { role: 'ADMIN' },
);

export const PUT = withAuth<RouteContext>(
  async (request: NextRequest, { params }) => {
    const { id } = await params;

    const existing = await prisma.voucher.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Voucher tidak ditemukan' }, { status: 404 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = updateVoucherSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const type = data.type ?? existing.type;
    const value = data.value ?? existing.value;
    const maxDiscount = data.maxDiscount !== undefined ? data.maxDiscount : existing.maxDiscount;
    const startsAt = data.startsAt !== undefined ? data.startsAt : existing.startsAt;
    const expiresAt = data.expiresAt !== undefined ? data.expiresAt : existing.expiresAt;

    if (type === 'FIXED' && maxDiscount != null) {
      return NextResponse.json(
        {
          error: 'Validasi gagal',
          issues: { maxDiscount: ['maxDiscount hanya untuk tipe PERCENT'] },
        },
        { status: 400 },
      );
    }

    if (type === 'PERCENT' && value > 100) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: { value: ['Persentase maksimal 100'] } },
        { status: 400 },
      );
    }

    if (startsAt && expiresAt && startsAt >= expiresAt) {
      return NextResponse.json(
        {
          error: 'Validasi gagal',
          issues: { expiresAt: ['Tanggal berakhir harus setelah tanggal mulai'] },
        },
        { status: 400 },
      );
    }

    try {
      const voucher = await prisma.voucher.update({ where: { id }, data });
      return NextResponse.json(voucher);
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

export const DELETE = withAuth<RouteContext>(
  async (_request: NextRequest, { params }) => {
    const { id } = await params;

    const existing = await prisma.voucher.findUnique({
      where: { id },
      select: { id: true, usedCount: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Voucher tidak ditemukan' }, { status: 404 });
    }

    if (existing.usedCount > 0) {
      return NextResponse.json(
        {
          error:
            'Voucher sudah pernah digunakan dan tidak bisa dihapus. Nonaktifkan voucher ini sebagai gantinya.',
        },
        { status: 409 },
      );
    }

    await prisma.voucher.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  },
  { role: 'ADMIN' },
);
