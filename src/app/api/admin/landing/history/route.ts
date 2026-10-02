import { NextResponse } from 'next/server';

import { withAuth } from '@/server/auth';
import { githubErrorResponse } from '@/server/landing/errors';
import { listLandingCommits } from '@/server/landing/github';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async () => {
    try {
      return NextResponse.json({ commits: await listLandingCommits(20) });
    } catch (error) {
      return githubErrorResponse(error);
    }
  },
  { role: 'ADMIN' },
);
