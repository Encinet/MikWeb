import { createProxyHandler } from '@/lib/proxyRoute';
import type { BansApiResponse } from '@/lib/types';

export const GET = createProxyHandler<BansApiResponse>({
  serverUrl: process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080',
  totpSecret: process.env.TOTP_SECRET || '',
  path: '/api/bans',
  cacheMaxAge: 60,
  errorMessage: 'Failed to fetch ban list',
});
