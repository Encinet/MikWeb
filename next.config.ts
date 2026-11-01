import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  async headers() {
    const headers = [
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
      },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Cache-Control', value: 'no-store' },
    ];
    return [
      { source: '/:locale/login', headers },
      { source: '/:locale/chat', headers },
      { source: '/:locale/account/:path*', headers },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mineskin.eu',
      },
      {
        protocol: 'https',
        hostname: 'minotar.net',
      },
      {
        protocol: 'https',
        hostname: 'mc-heads.net',
      },
    ],
    minimumCacheTTL: 864000, // 10 days cache for player avatars
  },
  experimental: {
    optimizePackageImports: ['motion/react'],
  },
};

export default withNextIntl(nextConfig);
