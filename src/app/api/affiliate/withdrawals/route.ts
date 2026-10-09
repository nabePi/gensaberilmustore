import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import {
  MIN_WITHDRAWAL_AMOUNT,
  createWithdrawalSchema,
  getWithdrawableBalance,
} from '@/server/affiliate/withdrawal';
import { withAuth } from '@/server/auth';

class WithdrawalError extends Error {}

export const GET = withAuth(async (_request, { user }) => {
  const profile = await prisma.affiliateProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return NextResponse.json({ error: 'Anda belum menjadi afiliasi' }, { status: 404 });
  }

  const [available, withdrawals] = await Promise.all([
    getWithdrawableBalance(prisma, profile.id),
    prisma.affiliateWithdrawal.findMany({
      where: { affiliateProfileId: profile.id },
      orderBy: { requestedAt: 'desc' },
      select: { id: true, amount: true, status: true, requestedAt: true, completedAt: true },
    }),
  ]);

  return NextResponse.json({
    available,
    minAmount: MIN_WITHDRAWAL_AMOUNT,
    bank: {
      name: profile.payoutBankName,
      account: profile.payoutBankAccount,
      holder: profile.payoutBankHolder,
    },
    withdrawals,
  });
});

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const profile = await prisma.affiliateProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return NextResponse.json({ error: 'Anda belum menjadi afiliasi' }, { status: 404 });
  }
  if (profile.status !== 'APPROVED' || !profile.isActive) {
    return NextResponse.json({ error: 'Akun afiliasi Anda belum aktif' }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = createWithdrawalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validasi gagal' },
      { status: 400 },
    );
  }
  const { amount } = parsed.data;

  try {
    // Serializable so two concurrent requests cannot both spend the same balance.
    const withdrawal = await prisma.$transaction(
      async (tx) => {
        const available = await getWithdrawableBalance(tx, profile.id);
        if (available < MIN_WITHDRAWAL_AMOUNT) {
          throw new WithdrawalError('Komisi masuk belum mencapai Rp50.000');
        }
        if (amount > available) {
          throw new WithdrawalError('Jumlah melebihi komisi masuk yang tersedia');
        }
        return tx.affiliateWithdrawal.create({
          data: {
            affiliateProfileId: profile.id,
            amount,
            bankName: profile.payoutBankName,
            bankAccount: profile.payoutBankAccount,
            bankHolder: profile.payoutBankHolder,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    return NextResponse.json(withdrawal, { status: 201 });
  } catch (error) {
    if (error instanceof WithdrawalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json(
        { error: 'Permintaan bersamaan terdeteksi, coba lagi sebentar' },
        { status: 409 },
      );
    }
    throw error;
  }
});
