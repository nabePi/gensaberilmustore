type Bucket = { count: number; resetAt: number };

type RateLimitResult = {
  limited: boolean;
  retryAfterSeconds: number;
};

function createRateLimiter(windowMs: number, maxAttempts: number) {
  const buckets = new Map<string, Bucket>();

  function check(key: string): RateLimitResult {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { limited: false, retryAfterSeconds: 0 };
    }

    if (bucket.count >= maxAttempts) {
      return { limited: true, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
    }

    bucket.count += 1;
    return { limited: false, retryAfterSeconds: 0 };
  }

  function reset(key: string): void {
    buckets.delete(key);
  }

  return { check, reset };
}

const loginLimiter = createRateLimiter(15 * 60 * 1000, 10);
export const checkLoginRateLimit = loginLimiter.check;
export const resetLoginRateLimit = loginLimiter.reset;

const forgotPasswordLimiter = createRateLimiter(60 * 60 * 1000, 3);
export const checkForgotPasswordRateLimit = forgotPasswordLimiter.check;

const adminLoginLimiter = createRateLimiter(15 * 60 * 1000, 5);
export const checkAdminLoginRateLimit = adminLoginLimiter.check;
export const resetAdminLoginRateLimit = adminLoginLimiter.reset;
