import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withAuth } from '@/server/auth';
import { reportPeriodSchema } from '@/server/reports/period';
import { getPosVsOnline } from '@/server/reports/pos-vs-online';

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

    const data = await getPosVsOnline(parsed.data.period);
    return NextResponse.json(data);
  },
  { role: 'ADMIN' },
);
