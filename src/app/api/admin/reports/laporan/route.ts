import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withAuth } from '@/server/auth';
import { getLaporanReport } from '@/server/reports/laporan';

const querySchema = z.object({
  period: z.enum(['all', 'today', 'week', 'month']).default('all'),
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

    const report = await getLaporanReport(parsed.data.period);
    return NextResponse.json(report);
  },
  { role: 'ADMIN' },
);
