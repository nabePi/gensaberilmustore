import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { githubErrorResponse } from '@/server/landing/errors';
import { InvalidLiveContentError, loadLiveLanding } from '@/server/landing/live';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async () => {
    try {
      const [live, draft] = await Promise.all([
        loadLiveLanding(),
        prisma.landingDraft.findUnique({ where: { id: 1 } }),
      ]);

      return NextResponse.json({
        live: { content: live.content, sha: live.sha },
        // A draft built on an older GitHub version is flagged so the UI can warn
        // before it overwrites edits made elsewhere.
        draft: draft
          ? {
              content: draft.content,
              baseSha: draft.baseSha,
              updatedAt: draft.updatedAt,
              stale: draft.baseSha !== live.sha,
            }
          : null,
      });
    } catch (error) {
      if (error instanceof InvalidLiveContentError) {
        return NextResponse.json({ error: error.message, code: 'INVALID_LIVE' }, { status: 502 });
      }
      return githubErrorResponse(error);
    }
  },
  { role: 'ADMIN' },
);
