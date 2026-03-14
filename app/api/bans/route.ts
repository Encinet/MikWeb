import { createProxyHandler } from '@/lib/proxyRoute';

export const GET = createProxyHandler({
  serverUrl: process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080',
  apiKey: process.env.MINECRAFT_API_KEY || '',
  path: '/api/bans',
  cacheDuration: 60000,
  cacheMaxAge: 60,
  errorMessage: 'Failed to fetch ban list',
});
