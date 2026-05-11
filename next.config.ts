import type { NextConfig } from 'next';
import { securityHeaders } from './lib/security/headers';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders.map((h) => ({ key: h.key, value: h.value })),
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'public-api.birdeye.so' },
      { protocol: 'https', hostname: 'birdeye.so' },
    ],
  },
};

export default nextConfig;

