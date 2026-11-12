import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { CHAT_WEBSOCKET_URL, DATA_API_ORIGIN } from './src/shared/config/service-config';
import { routing } from './src/shared/i18n/routing';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    // Filesystem routes run first. Send remaining non-locale paths through the unlocalized
    // root's global 404 instead of treating missing resource names as locale parameters.
    return [
      {
        source: `/:path((?!(?:${routing.locales.join('|')}|api|_next|_vercel)(?:/|$)).+)`,
        destination: '/',
      },
    ];
  },
  async headers() {
    const headers = [
      {
        key: 'Content-Security-Policy',
        value: `frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'; connect-src 'self' ${DATA_API_ORIGIN} ${new URL(CHAT_WEBSOCKET_URL).origin}; upgrade-insecure-requests`,
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
