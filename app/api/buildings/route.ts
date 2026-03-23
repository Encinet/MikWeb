import { createProxyHandler } from '@/lib/proxyRoute';

export const GET = createProxyHandler({
  serverUrl: process.env.BUILDINGS_SERVER_URL || process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080',
  apiKey: process.env.BUILDINGS_API_KEY || process.env.MINECRAFT_API_KEY || '',
  path: '/api/buildings',
  cacheMaxAge: 300,
  errorMessage: 'Failed to fetch buildings',
});
