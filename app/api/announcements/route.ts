import { createProxyHandler } from '@/lib/proxyRoute';
import type { AnnouncementsApiResponse } from '@/lib/types';

export const GET = createProxyHandler<AnnouncementsApiResponse>({
  serverUrl: process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080',
  totpSecret: process.env.TOTP_SECRET || '',
  path: '/api/announcements',
  cacheMaxAge: 300,
  errorMessage: 'Failed to fetch announcements',
});
