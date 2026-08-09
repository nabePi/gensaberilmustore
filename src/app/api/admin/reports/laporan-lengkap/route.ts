import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withAuth } from '@/server/auth';
import { getLaporanLengkap } from '@/server/reports/laporan-lengkap';

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(3000).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
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

    const report = await getLaporanLengkap(parsed.data);
    return NextResponse.json(report);
  },
  { role: 'ADMIN' },
);
