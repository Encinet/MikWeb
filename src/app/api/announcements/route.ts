import type { AnnouncementsApiResponse } from '@/modules/announcement/model/announcement-types';
import { createProxyHandler } from '@/shared/api/proxy-route';

export const GET = createProxyHandler<AnnouncementsApiResponse>({
  serverUrl: process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080',
  totpSecret: process.env.TOTP_SECRET || '',
  path: '/api/announcements',
  cacheMaxAge: 300,
  errorMessage: 'Failed to fetch announcements',
});
