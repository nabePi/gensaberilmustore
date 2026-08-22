import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default async function config(phase: string) {
  // Secrets aren't available yet during `next build` in Docker (they're
  // only injected at container runtime), so skip eager validation here.
  // `next dev` / `next start` still validate env on startup as normal.
  if (phase !== PHASE_PRODUCTION_BUILD) {
    await import('@/env');
  }

  return nextConfig;
}
