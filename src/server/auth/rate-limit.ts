const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

type RateLimitResult = {
  limited: boolean;
  retryAfterSeconds: number;
};

export function checkLoginRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, retryAfterSeconds: 0 };
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return { limited: true, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { limited: false, retryAfterSeconds: 0 };
}

export function resetLoginRateLimit(key: string): void {
  buckets.delete(key);
}
