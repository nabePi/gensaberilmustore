import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withAuth } from '@/server/auth';
import { getPaymentMethods } from '@/server/reports/payment-methods';
import { reportPeriodSchema } from '@/server/reports/period';

const querySchema = z.object({
  period: reportPeriodSchema.default('30d'),
});

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = await getPaymentMethods(parsed.data.period);
    return NextResponse.json({ items: data });
  },
  { role: 'ADMIN' },
);
