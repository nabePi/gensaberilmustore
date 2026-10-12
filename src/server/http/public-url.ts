import type { NextRequest } from 'next/server';

// Behind a reverse proxy `request.url` carries the internal bind address
// (e.g. 0.0.0.0:3000), so redirects must be built from the forwarded host.
export function publicUrl(path: string, request: NextRequest): URL {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return new URL(path, request.url);
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ??
    request.nextUrl.protocol.replace(':', '');
  return new URL(path, `${proto}://${host.split(',')[0]!.trim()}`);
}
