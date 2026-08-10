import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withAuth } from '@/server/auth';
import { reportPeriodSchema } from '@/server/reports/period';
import { getTopProducts } from '@/server/reports/top-products';

const querySchema = z.object({
  period: reportPeriodSchema.default('30d'),
  limit: z.coerce.number().int().min(1).max(100).default(10),
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

    const data = await getTopProducts(parsed.data.period, parsed.data.limit);
    return NextResponse.json(data);
  },
  { role: 'ADMIN' },
);
