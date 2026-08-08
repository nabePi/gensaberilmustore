import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { getSession } from '@/server/auth';
import { voucherValidateSchema } from '@/server/vouchers/schema';
import { validateVoucherCode } from '@/server/vouchers/validate';

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = voucherValidateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { code, subtotal, channel } = parsed.data;
  const user = await getSession(request);

  const result = await validateVoucherCode(prisma, code, {
    subtotal,
    channel,
    userId: user?.id ?? null,
  });

  if (!result.valid) {
    return NextResponse.json({ valid: false, reason: result.reason });
  }

  return NextResponse.json({
    valid: true,
    voucherId: result.voucher.id,
    code: result.voucher.code,
    type: result.voucher.type,
    discountAmount: result.discountAmount,
  });
}
