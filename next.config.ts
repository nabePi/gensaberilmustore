import type { NextConfig } from 'next';

// Validate environment variables at startup. This will throw a clear error
// and stop the process if any required env var is missing or invalid.
import '@/env';

const nextConfig: NextConfig = {/* config options here */};

export default nextConfig;
