import { NextResponse } from 'next/server';

import { withAuth } from '@/server/auth';
import { getAdminSummary } from '@/server/reports/summary';

export const GET = withAuth(
  async () => {
    const summary = await getAdminSummary();
    return NextResponse.json(summary);
  },
  { role: 'ADMIN' },
);
