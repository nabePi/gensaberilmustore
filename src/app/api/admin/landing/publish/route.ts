import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { createRateLimiter } from '@/server/auth/rate-limit';
import { githubErrorResponse } from '@/server/landing/errors';
import { commitLandingFile, GithubError } from '@/server/landing/github';
import { InvalidLiveContentError, loadLiveLanding } from '@/server/landing/live';
import { landingPublishSchema, serializeLandingContent } from '@/server/landing/schema';

const publishLimiter = createRateLimiter(10 * 60 * 1000, 10);

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    const limit = publishLimiter.check(user.id);
    if (limit.limited) {
      return NextResponse.json(
        { error: 'Terlalu sering commit, coba lagi nanti.' },
        { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = landingPublishSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const adminName = user.name ?? user.email;
    const summary = parsed.data.message ?? 'content(landing): perbarui konten landing page';
    const message = `${summary}\n\nDiubah lewat admin store oleh ${adminName}`;
    const nextContent = serializeLandingContent(parsed.data.content);

    try {
      const live = await loadLiveLanding();

      if (live.sha !== parsed.data.baseSha) {
        return NextResponse.json(
          {
            error: 'Konten di GitHub sudah berubah sejak Anda membuka editor. Muat ulang dulu.',
            code: 'CONFLICT',
          },
          { status: 409 },
        );
      }

      if (nextContent === live.raw) {
        return NextResponse.json(
          { error: 'Tidak ada perubahan untuk di-commit.' },
          { status: 400 },
        );
      }

      const commit = await commitLandingFile({
        content: nextContent,
        baseSha: parsed.data.baseSha,
        message,
      });

      await prisma.$transaction([
        prisma.landingPublishLog.create({
          data: {
            userId: user.id,
            userName: adminName,
            message: summary,
            commitSha: commit.commitSha,
            commitUrl: commit.commitUrl,
            status: 'SUCCESS',
          },
        }),
        prisma.landingDraft.deleteMany({ where: { id: 1 } }),
      ]);

      return NextResponse.json({
        commit: { sha: commit.commitSha, url: commit.commitUrl },
        sha: commit.blobSha,
      });
    } catch (error) {
      if (error instanceof InvalidLiveContentError) {
        return NextResponse.json({ error: error.message, code: 'INVALID_LIVE' }, { status: 502 });
      }
      if (error instanceof GithubError) {
        await prisma.landingPublishLog.create({
          data: {
            userId: user.id,
            userName: adminName,
            message: summary,
            status: error.code === 'CONFLICT' ? 'CONFLICT' : 'FAILED',
            error: error.message,
          },
        });
      }
      return githubErrorResponse(error);
    }
  },
  { role: 'ADMIN' },
);
