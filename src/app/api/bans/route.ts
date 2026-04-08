import type { BansApiResponse } from '@/modules/ban/model/ban-types';
import { createProxyHandler } from '@/shared/api/proxy-route';

export const GET = createProxyHandler<BansApiResponse>({
  serverUrl: process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080',
  totpSecret: process.env.TOTP_SECRET || '',
  path: '/api/bans',
  cacheMaxAge: 60,
  errorMessage: 'Failed to fetch ban list',
});
