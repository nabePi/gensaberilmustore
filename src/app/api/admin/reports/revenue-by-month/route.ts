import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withAuth } from '@/server/auth';
import { getRevenueByMonth } from '@/server/reports/revenue-by-month';

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()),
  source: z.enum(['ONLINE', 'POS']).optional(),
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

    const data = await getRevenueByMonth(parsed.data.year, parsed.data.source);
    return NextResponse.json({ items: data });
  },
  { role: 'ADMIN' },
);
