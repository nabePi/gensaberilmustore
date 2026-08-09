import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteContext>(
  async (_request, { params }) => {
    const { id } = await params;

    const profile = await prisma.affiliateProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        productSelections: {
          orderBy: { createdAt: 'desc' },
          include: { product: { select: { id: true, title: true, slug: true } } },
        },
        conversions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { order: { select: { orderNumber: true, createdAt: true, total: true } } },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Afiliasi tidak ditemukan' }, { status: 404 });
    }

    const commissionByStatus = profile.conversions.reduce<Record<string, number>>(
      (acc, conversion) => {
        acc[conversion.status] = (acc[conversion.status] ?? 0) + conversion.commissionAmount;
        return acc;
      },
      { PENDING: 0, APPROVED: 0, PAID: 0, REJECTED: 0 },
    );

    return NextResponse.json({
      id: profile.id,
      code: profile.code,
      isActive: profile.isActive,
      joinedAt: profile.joinedAt,
      user: profile.user,
      payout: {
        bankName: profile.payoutBankName,
        bankAccount: profile.payoutBankAccount,
        bankHolder: profile.payoutBankHolder,
      },
      products: profile.productSelections.map((selection) => ({
        productId: selection.productId,
        title: selection.product.title,
        slug: selection.product.slug,
      })),
      conversions: profile.conversions.map((conversion) => ({
        id: conversion.id,
        orderNumber: conversion.order.orderNumber,
        orderTotal: conversion.order.total,
        commissionAmount: conversion.commissionAmount,
        status: conversion.status,
        createdAt: conversion.createdAt,
      })),
      commissionByStatus,
    });
  },
  { role: 'ADMIN' },
);
