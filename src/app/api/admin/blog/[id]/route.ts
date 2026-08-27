import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { updateBlogPostSchema } from '@/server/blog/schema';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteContext>(
  async (_request: NextRequest, { params }) => {
    const { id } = await params;

    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: 'Artikel tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(post);
  },
  { role: 'ADMIN' },
);

export const PUT = withAuth<RouteContext>(
  async (request: NextRequest, { params }) => {
    const { id } = await params;

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Artikel tidak ditemukan' }, { status: 404 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = updateBlogPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { title, slug, excerpt, contentHtml, coverImageUrl, author, tags, status } = parsed.data;

    if (slug !== undefined && slug !== existing.slug) {
      const duplicate = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Validasi gagal', issues: { slug: ['Slug sudah digunakan'] } },
          { status: 409 },
        );
      }
    }

    const nextStatus = status ?? existing.status;
    const publishedAt =
      nextStatus === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : existing.publishedAt;

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(excerpt !== undefined ? { excerpt } : {}),
        ...(contentHtml !== undefined ? { contentHtml } : {}),
        ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
        ...(author !== undefined ? { author } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(status !== undefined ? { status } : {}),
        publishedAt,
      },
    });

    return NextResponse.json(post);
  },
  { role: 'ADMIN' },
);

export const DELETE = withAuth<RouteContext>(
  async (_request: NextRequest, { params }) => {
    const { id } = await params;

    const existing = await prisma.blogPost.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Artikel tidak ditemukan' }, { status: 404 });
    }

    await prisma.blogPost.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  },
  { role: 'ADMIN' },
);
