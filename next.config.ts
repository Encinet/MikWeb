import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { SESSION_COOKIE_NAME } from './src/modules/auth/model/auth-cookies';
import { SITE_HOSTNAME } from './src/shared/config/site-config';
import { routing } from './src/shared/i18n/routing';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Bun misses Turbopack's generated Sharp alias in the development server.
  turbopack:
    process.env.NODE_ENV === 'development' && process.versions.bun
      ? { resolveAlias: { sharp: './src/shared/server/sharp-dev.ts' } }
      : undefined,
  async rewrites() {
    // Filesystem routes run first. Send remaining non-locale paths through the unlocalized
    // root's global 404 instead of treating missing resource names as locale parameters.
    return {
      beforeFiles: [
        {
          source: '/api/chat/session',
          missing: [{ type: 'cookie', key: SESSION_COOKIE_NAME }],
          destination: '/api/auth/guest.json',
        },
        {
          source: '/api/chat/session',
          has: [{ type: 'cookie', key: SESSION_COOKIE_NAME }],
          destination: 'https://data.mcmik.top/chat/session',
        },
        {
          source: '/api/chat/connect',
          destination: 'https://data.mcmik.top/chat/connect',
        },
        {
          source: '/api/auth/me',
          missing: [{ type: 'cookie', key: SESSION_COOKIE_NAME }],
          destination: '/api/auth/guest.json',
        },
      ],
      afterFiles: [
        {
          source: `/:path((?!(?:${routing.locales.join('|')}|api|_next|_vercel)(?:/|$)).+)`,
          destination: '/',
        },
      ],
    };
  },
  async headers() {
    const privatePageHeaders = [{ key: 'Referrer-Policy', value: 'no-referrer' }];
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: SITE_HOSTNAME.replaceAll('.', '\\.') }],
        headers: [{ key: 'Strict-Transport-Security', value: 'max-age=63072000' }],
      },
      {
        source: '/api/mcp',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'Content-Type, Authorization, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Session-Id, Last-Event-ID',
          },
          { key: 'Access-Control-Expose-Headers', value: 'MCP-Protocol-Version, Mcp-Session-Id' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
      {
        source: '/api/chat/:action(session|connect)',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
      {
        source: '/api/auth/me',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
      {
        source: '/_next/static/chunks/chat-notifications-worker.:path*',
        headers: [{ key: 'Service-Worker-Allowed', value: '/' }],
      },
      { source: '/:locale/:page(login|chat)', headers: privatePageHeaders },
      { source: '/:locale/account/:path*', headers: privatePageHeaders },
    ];
  },
  experimental: {
    globalNotFound: true,
    optimizePackageImports: ['motion/react'],
  },
};

export default withNextIntl(nextConfig);
