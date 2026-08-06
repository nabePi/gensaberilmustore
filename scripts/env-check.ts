import { env } from '@/env';

// This script is used by `pnpm env:check` to validate environment variables
// at startup. Importing `@/env` will throw a clear error if validation fails.

// eslint-disable-next-line no-console
console.log(`Environment OK (${env.nodeEnv})`);
