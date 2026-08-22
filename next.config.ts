import type { NextConfig } from 'next';

// Env validation happens lazily the first time a server module imports
// `@/env` (e.g. src/server/auth/session.ts on the first request), not here.
// `next.config.ts`'s own transpiler only bundles static imports, so a
// dynamic `import('@/env')` here would break `next dev`/`next start` (it
// falls through to a plain Node require, which can't resolve the .ts file).
const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
