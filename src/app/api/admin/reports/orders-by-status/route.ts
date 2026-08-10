import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withAuth } from '@/server/auth';
import { getOrdersByStatus } from '@/server/reports/orders-by-status';
import { reportPeriodSchema } from '@/server/reports/period';

const querySchema = z.object({
  period: reportPeriodSchema.default('30d'),
  source: z.enum(['ONLINE', 'POS', 'ALL']).default('ALL'),
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

    const data = await getOrdersByStatus(parsed.data.period, parsed.data.source);
    return NextResponse.json(data);
  },
  { role: 'ADMIN' },
);
