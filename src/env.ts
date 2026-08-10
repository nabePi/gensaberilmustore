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

  // Storage placeholders
  STORAGE_PROVIDER: z.enum(['s3', 'local']).optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_KEY: z.string().optional(),
  S3_SECRET: z.string().optional(),

  // Monitoring placeholders
  SENTRY_DSN: z.string().optional(),
});

const validatedEnvSchema = envSchema.refine((data) => data.AUTH_SECRET ?? data.NEXTAUTH_SECRET, {
  message: 'Either NEXTAUTH_SECRET or AUTH_SECRET is required (min 32 characters)',
  path: ['NEXTAUTH_SECRET'],
});

const formatFieldErrors = (errors: Record<string, string[] | undefined>) =>
  Object.entries(errors)
    .filter((entry): entry is [string, string[]] => entry[1] !== undefined)
    .map(([key, messages]) => `  - ${key}: ${messages.join(', ')}`)
    .join('\n');

const parseEnv = () => {
  const parsed = validatedEnvSchema.safeParse(process.env);

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
  s3Endpoint: rawEnv.S3_ENDPOINT,
  s3Bucket: rawEnv.S3_BUCKET,
  s3Key: rawEnv.S3_KEY,
  s3Secret: rawEnv.S3_SECRET,

  sentryDsn: rawEnv.SENTRY_DSN,
};

export type Env = typeof env;
