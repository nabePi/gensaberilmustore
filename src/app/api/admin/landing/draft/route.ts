import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { landingDraftSchema } from '@/server/landing/schema';

export const PUT = withAuth(
  async (request: NextRequest, { user }) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = landingDraftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = {
      content: parsed.data.content,
      baseSha: parsed.data.baseSha,
      updatedById: user.id,
    };
    const draft = await prisma.landingDraft.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    });

    return NextResponse.json({ draft: { baseSha: draft.baseSha, updatedAt: draft.updatedAt } });
  },
  { role: 'ADMIN' },
);

export const DELETE = withAuth(
  async () => {
    await prisma.landingDraft.deleteMany({ where: { id: 1 } });
    return NextResponse.json({ ok: true });
  },
  { role: 'ADMIN' },
);
