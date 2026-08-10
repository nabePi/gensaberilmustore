import { env } from '@/env';

export const AFFILIATE_COOKIE_NAME = 'gsb_aff';
export const AFFILIATE_CLICK_ID_COOKIE_NAME = 'gsb_cid';

const AFFILIATE_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const AFFILIATE_CLICK_ID_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function affiliateCookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: env.nodeEnv === 'production',
    maxAge: AFFILIATE_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  };
}

export function affiliateClickIdCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.nodeEnv === 'production',
    maxAge: AFFILIATE_CLICK_ID_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  };
}
