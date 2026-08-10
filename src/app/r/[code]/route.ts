import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import {
  AFFILIATE_CLICK_ID_COOKIE_NAME,
  AFFILIATE_COOKIE_NAME,
  affiliateClickIdCookieOptions,
  affiliateCookieOptions,
} from '@/server/affiliate/cookie';
import { getClientIp } from '@/server/http/client-ip';

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { code } = await params;
  const productSlug = request.nextUrl.searchParams.get('p');
  const redirectUrl = new URL(productSlug ? `/products/${productSlug}` : '/', request.url);

  const profile = await prisma.affiliateProfile.findUnique({ where: { code } });

  if (!profile || !profile.isActive) {
    return NextResponse.redirect(redirectUrl);
  }

  const cookieId = request.cookies.get(AFFILIATE_CLICK_ID_COOKIE_NAME)?.value ?? randomUUID();

  const product = productSlug
    ? await prisma.product.findUnique({ where: { slug: productSlug }, select: { id: true } })
    : null;

  await prisma.affiliateClick
    .create({
      data: {
        affiliateProfileId: profile.id,
        productId: product?.id ?? null,
        sourceUrl: request.headers.get('referer'),
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? 'unknown',
        cookieId,
      },
    })
    .catch(() => {
      // click tracking is best-effort and must never block the redirect
    });

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(AFFILIATE_CLICK_ID_COOKIE_NAME, cookieId, affiliateClickIdCookieOptions());
  response.cookies.set(AFFILIATE_COOKIE_NAME, code, affiliateCookieOptions());

  return response;
}
