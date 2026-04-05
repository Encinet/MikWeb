import { createProxyHandler } from '@/lib/proxyRoute';
import type { PlayersHistoryPayload } from '@/lib/types';

function resolveHistoryCacheMaxAge(request: Request): number | null {
  const requestUrl = new URL(request.url);
  const to = requestUrl.searchParams.get('to');

  if (!to) {
    return null;
  }

  const toTimestamp = Date.parse(to);

  if (Number.isNaN(toTimestamp)) {
    return null;
  }

  return toTimestamp < Date.now() ? 300 : null;
}

export const GET = createProxyHandler<PlayersHistoryPayload>({
  serverUrl: process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080',
  totpSecret: process.env.TOTP_SECRET || '',
  path: '/api/players/history',
  cacheMaxAge: resolveHistoryCacheMaxAge,
  errorMessage: 'Failed to fetch player history',
  forwardSearchParams: true,
});
