import { createProxyHandler } from '@/lib/proxyRoute';

export const GET = createProxyHandler({
  serverUrl: process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080',
  apiKey: process.env.MINECRAFT_API_KEY || '',
  path: '/api/players',
  cacheDuration: 5000,
  cacheMaxAge: 5,
  errorMessage: 'Failed to fetch player data',
  staleOnError: false,
});
