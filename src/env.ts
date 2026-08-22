import { z } from 'zod';

const MIN_SECRET_LENGTH = 32;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is required (postgresql://...)' })
    .refine((value) => value.startsWith('postgresql://'), {
      message: 'DATABASE_URL is required (postgresql://...)',
    }),

  NEXTAUTH_SECRET: z.string().min(MIN_SECRET_LENGTH).optional(),
  AUTH_SECRET: z.string().min(MIN_SECRET_LENGTH).optional(),

  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET is required (min 32 characters)' })
    .min(MIN_SECRET_LENGTH, 'JWT_SECRET is required (min 32 characters)'),

  // Payment gateway (Midtrans)
  MIDTRANS_SERVER_KEY: z.string().optional(),
  MIDTRANS_CLIENT_KEY: z.string().optional(),
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: z.string().optional(),
  MIDTRANS_IS_PRODUCTION: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),

  // Notification placeholders
  FONNTE_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  NOTIFY_FROM_EMAIL: z.string().email().optional(),
  CRON_SECRET: z.string().optional(),

  // File storage: local disk (dev default) or Cloudflare R2 (S3-compatible)
  STORAGE_PROVIDER: z.enum(['r2', 'local']).default('local'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),

  // Monitoring placeholders
  SENTRY_DSN: z.string().optional(),
});

const validatedEnvSchema = envSchema
  .refine((data) => data.AUTH_SECRET ?? data.NEXTAUTH_SECRET, {
    message: 'Either NEXTAUTH_SECRET or AUTH_SECRET is required (min 32 characters)',
    path: ['NEXTAUTH_SECRET'],
  })
  .refine(
    (data) =>
      data.STORAGE_PROVIDER !== 'r2' ||
      (data.R2_ACCOUNT_ID &&
        data.R2_ACCESS_KEY_ID &&
        data.R2_SECRET_ACCESS_KEY &&
        data.R2_BUCKET &&
        data.R2_PUBLIC_URL),
    {
      message:
        'R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_URL are required when STORAGE_PROVIDER=r2',
      path: ['STORAGE_PROVIDER'],
    },
  );

const formatFieldErrors = (errors: Record<string, string[] | undefined>) =>
  Object.entries(errors)
    .filter((entry): entry is [string, string[]] => entry[1] !== undefined)
    .map(([key, messages]) => `  - ${key}: ${messages.join(', ')}`)
    .join('\n');

// During `next build`, Next.js spawns worker processes to collect page data
// (importing every route module, including this one transitively) before
// any server actually starts. Those workers inherit NEXT_PHASE=
// 'phase-production-build' from the parent build process. Docker builds
// don't have real secrets available yet at that point (they're injected at
// container runtime), so fall back to placeholders for required fields in
// that phase only. `next dev` / `next start` never set NEXT_PHASE this way,
// so real secrets are still enforced normally at runtime.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

const buildPhaseFallbacks: Record<string, string> = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/placeholder',
  JWT_SECRET: 'build-phase-placeholder-not-a-real-secret-000000',
  AUTH_SECRET: 'build-phase-placeholder-not-a-real-secret-000000',
};

// docker-compose sets every variable listed under `environment:` even when
// the underlying value is unset (e.g. an unconfigured optional var becomes
// "" in the container, not absent). Treat empty strings as not provided so
// optional fields and defaults behave the same as when the var is unset.
const dropEmptyStrings = (source: NodeJS.ProcessEnv) =>
  Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));

const parseEnv = () => {
  const source = isBuildPhase
    ? {
        ...process.env,
        ...Object.fromEntries(
          Object.entries(buildPhaseFallbacks).map(([key, fallback]) => [
            key,
            process.env[key] || fallback,
          ]),
        ),
      }
    : process.env;

  const parsed = validatedEnvSchema.safeParse(dropEmptyStrings(source));

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const formattedErrors = formatFieldErrors(fieldErrors);

    throw new Error(
      `Environment validation failed. Please check your .env file:\n${formattedErrors}`,
    );
  }

  return parsed.data;
};

const rawEnv = parseEnv();

export const env = {
  nodeEnv: rawEnv.NODE_ENV,
  databaseUrl: rawEnv.DATABASE_URL,
  authSecret: rawEnv.AUTH_SECRET ?? rawEnv.NEXTAUTH_SECRET,
  jwtSecret: rawEnv.JWT_SECRET,

  midtransServerKey: rawEnv.MIDTRANS_SERVER_KEY,
  midtransClientKey: rawEnv.MIDTRANS_CLIENT_KEY,
  midtransIsProduction: rawEnv.MIDTRANS_IS_PRODUCTION ?? false,

  fonnteToken: rawEnv.FONNTE_TOKEN,
  resendApiKey: rawEnv.RESEND_API_KEY,
  notifyFromEmail: rawEnv.NOTIFY_FROM_EMAIL ?? 'no-reply@gensaberilmustore.com',
  cronSecret: rawEnv.CRON_SECRET,

  storageProvider: rawEnv.STORAGE_PROVIDER,
  r2AccountId: rawEnv.R2_ACCOUNT_ID,
  r2AccessKeyId: rawEnv.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: rawEnv.R2_SECRET_ACCESS_KEY,
  r2Bucket: rawEnv.R2_BUCKET,
  r2PublicUrl: rawEnv.R2_PUBLIC_URL,

  sentryDsn: rawEnv.SENTRY_DSN,
};

export type Env = typeof env;
