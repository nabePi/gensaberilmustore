import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { createRateLimiter } from '@/server/auth/rate-limit';
import { getClientIp } from '@/server/http/client-ip';
import { buildPrefixTsQuery } from '@/server/products/text-search';

const SUGGESTIONS_TAKE = 8;
const suggestLimiter = createRateLimiter(60 * 1000, 100);

const querySchema = z.object({ q: z.string().trim().min(2, 'Minimal 2 karakter') });

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = suggestLimiter.check(ip);

  if (rateLimit.limited) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan, coba lagi nanti' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const tsQuery = buildPrefixTsQuery(parsed.data.q);
  if (!tsQuery) {
    return NextResponse.json({ suggestions: [] });
  }

  const ranked = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM "Product"
    WHERE "isActive" = true
      AND (to_tsvector('simple', title) || to_tsvector('simple', author)) @@ to_tsquery('simple', ${tsQuery})
    ORDER BY ts_rank(
      to_tsvector('simple', title) || to_tsvector('simple', author),
      to_tsquery('simple', ${tsQuery})
    ) DESC
    LIMIT ${SUGGESTIONS_TAKE}
  `;

  const ids = ranked.map((row) => row.id);
  if (ids.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      finalPrice: true,
      images: {
        orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
        take: 1,
        select: { url: true },
      },
    },
  });

  const byId = new Map(products.map((product) => [product.id, product]));

  const suggestions = ids
    .map((id) => byId.get(id))
    .filter((product): product is (typeof products)[number] => product !== undefined)
    .map(({ images, ...product }) => ({ ...product, imageUrl: images[0]?.url ?? null }));

  return NextResponse.json({ suggestions });
}
