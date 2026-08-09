import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { generateUniqueAffiliateCode } from '@/server/affiliate/code';
import { withAuth } from '@/server/auth';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteContext>(
  async (_request, { params }) => {
    const { id } = await params;

    const member = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsappNumber: true,
        role: true,
        createdAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
        },
      },
    });

    if (!member || member.role === 'ADMIN') {
      return NextResponse.json({ error: 'Member tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(member);
  },
  { role: 'ADMIN' },
);

const updateMemberRoleSchema = z.object({
  role: z.enum(['BUYER', 'AFFILIATE']),
});

export const PATCH = withAuth<RouteContext>(
  async (request: NextRequest, { params }) => {
    const { id } = await params;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { role: true, name: true, email: true },
    });
    if (!existing || existing.role === 'ADMIN') {
      return NextResponse.json({ error: 'Member tidak ditemukan' }, { status: 404 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = updateMemberRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { role } = parsed.data;

    let affiliateCode: string | null = null;
    if (role === 'AFFILIATE') {
      const profile = await prisma.affiliateProfile.findUnique({ where: { userId: id } });
      if (!profile) {
        affiliateCode = await generateUniqueAffiliateCode(
          existing.name ?? existing.email,
          async (candidate) =>
            Boolean(
              await prisma.affiliateProfile.findUnique({
                where: { code: candidate },
                select: { id: true },
              }),
            ),
        );
      }
    }

    const member = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { role },
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      });

      if (role === 'BUYER') {
        await tx.affiliateProfile.updateMany({ where: { userId: id }, data: { isActive: false } });
      } else if (role === 'AFFILIATE') {
        if (affiliateCode) {
          await tx.affiliateProfile.create({
            data: {
              userId: id,
              code: affiliateCode,
              payoutBankName: '',
              payoutBankAccount: '',
              payoutBankHolder: '',
            },
          });
        } else {
          await tx.affiliateProfile.updateMany({
            where: { userId: id },
            data: { isActive: true },
          });
        }
      }

      return updated;
    });

    return NextResponse.json(member);
  },
  { role: 'ADMIN' },
);
