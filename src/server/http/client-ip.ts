import type { NextRequest } from 'next/server';

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim();
  return ip && ip.length > 0 ? ip : 'unknown';
}
