import { NextResponse } from 'next/server';

import { GithubError } from '@/server/landing/github';
import type { GithubErrorCode } from '@/server/landing/github';

const STATUS_BY_CODE: Record<GithubErrorCode, number> = {
  NOT_CONFIGURED: 503,
  AUTH: 502,
  NOT_FOUND: 502,
  CONFLICT: 409,
  RATE_LIMIT: 429,
  UNKNOWN: 502,
};

export function githubErrorResponse(error: unknown): NextResponse {
  if (error instanceof GithubError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: STATUS_BY_CODE[error.code] },
    );
  }
  throw error;
}
