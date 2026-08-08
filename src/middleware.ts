import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getAdminSession, getSession } from '@/server/auth';

export const config = {
  runtime: 'nodejs',
  matcher: ['/admin/:path*', '/api/admin/:path*', '/member/:path*', '/api/member/:path*'],
};

const ADMIN_PREFIXES = ['/admin', '/api/admin'];
const MEMBER_PREFIXES = ['/member', '/api/member'];

function unauthorized(request: NextRequest, loginPath: string): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.redirect(new URL(loginPath, request.url));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const user = await getAdminSession(request);
    if (!user || user.role !== 'ADMIN') {
      return unauthorized(request, '/admin/login');
    }
    return NextResponse.next();
  }

  if (MEMBER_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const user = await getSession(request);
    if (!user) {
      return unauthorized(request, '/login');
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}
