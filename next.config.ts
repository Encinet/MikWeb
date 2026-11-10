import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    const headers = [
      {
        key: 'Content-Security-Policy',
        value:
          "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'; connect-src 'self' https://data.mcmik.top wss://chat.mcmik.top; upgrade-insecure-requests",
      },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Cache-Control', value: 'no-store' },
    ];
    return [
      {
        source: '/_next/static/chunks/chat-notifications-worker.:path*',
        headers: [{ key: 'Service-Worker-Allowed', value: '/' }],
      },
      { source: '/:locale/login', headers },
      { source: '/:locale/chat', headers },
      { source: '/:locale/account/:path*', headers },
    ];
  },
  images: {
    minimumCacheTTL: 86400, // Match registered building images' daily revalidation.
  },
  experimental: {
    globalNotFound: true,
    optimizePackageImports: ['motion/react'],
  },
};

export default withNextIntl(nextConfig);
