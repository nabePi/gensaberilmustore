import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { generateUniqueAffiliateCode } from '@/server/affiliate/code';
import { affiliateJoinSchema } from '@/server/affiliate/schema';
import { withAuth } from '@/server/auth';
import { dispatchNotification } from '@/server/notify/dispatch';

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const existing = await prisma.affiliateProfile.findUnique({ where: { userId: user.id } });
  if (existing) {
    return NextResponse.json({ error: 'Anda sudah terdaftar sebagai afiliasi' }, { status: 400 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = affiliateJoinSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const code = await generateUniqueAffiliateCode(user.name ?? user.email, async (candidate) =>
    Boolean(
      await prisma.affiliateProfile.findUnique({
        where: { code: candidate },
        select: { id: true },
      }),
    ),
  );

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.affiliateProfile.create({
      data: {
        userId: user.id,
        code,
        payoutBankName: parsed.data.payoutBankName,
        payoutBankAccount: parsed.data.payoutBankAccount,
        payoutBankHolder: parsed.data.payoutBankHolder,
      },
    });

    if (user.role === 'BUYER') {
      await tx.user.update({ where: { id: user.id }, data: { role: 'AFFILIATE' } });
    }

    const notification = await tx.notification.create({
      data: {
        channel: 'EMAIL',
        recipient: user.email,
        template: 'AFFILIATE_JOIN',
        relatedUserId: user.id,
        payloadJson: { name: user.name ?? user.email, code: created.code },
      },
    });

    return { profile: created, notificationId: notification.id };
  });

  await dispatchNotification(result.notificationId);

  return NextResponse.json(result.profile, { status: 201 });
});
