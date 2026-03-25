import { createProxyHandler } from '@/lib/proxyRoute';

export const GET = createProxyHandler({
  serverUrl: process.env.BUILDINGS_SERVER_URL || process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080',
  totpSecret: process.env.BUILDINGS_TOTP_SECRET || process.env.TOTP_SECRET || '',
  path: '/api/buildings',
  cacheMaxAge: 300,
  errorMessage: 'Failed to fetch buildings',
});
