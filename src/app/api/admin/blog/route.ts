import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { withAuth } from '@/server/auth';
import { blogListQuerySchema, createBlogPostSchema } from '@/server/blog/schema';
import { generateUniqueSlug } from '@/server/products/slug';

export const GET = withAuth(
  async (request: NextRequest) => {
    const parsed = blogListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { page, limit, q, status } = parsed.data;

    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' as const } },
              { excerpt: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverImageUrl: true,
          author: true,
          tags: true,
          status: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json({ items, total });
  },
  { role: 'ADMIN' },
);

export const POST = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = createBlogPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { title, excerpt, contentHtml, coverImageUrl, author, tags, status } = parsed.data;

    const slug = parsed.data.slug
      ? parsed.data.slug
      : await generateUniqueSlug(title, async (candidate) =>
          Boolean(
            await prisma.blogPost.findUnique({ where: { slug: candidate }, select: { id: true } }),
          ),
        );

    const duplicate = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } });
    if (duplicate) {
      return NextResponse.json(
        { error: 'Validasi gagal', issues: { slug: ['Slug sudah digunakan'] } },
        { status: 409 },
      );
    }

    const post = await prisma.blogPost.create({
      data: {
        slug,
        title,
        excerpt,
        contentHtml,
        coverImageUrl: coverImageUrl ?? null,
        author,
        tags,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
    });

    return NextResponse.json(post, { status: 201 });
  },
  { role: 'ADMIN' },
);
