import type { PlayerHistoryPayload } from '@/modules/player/model/player-types';
import { createProxyHandler } from '@/shared/api/proxy-route';

interface PlayerHistoryRouteContext {
  params: Promise<{
    uuid: string;
  }>;
}

export const GET = createProxyHandler<PlayerHistoryPayload, PlayerHistoryRouteContext>({
  serverUrl: process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080',
  totpSecret: process.env.TOTP_SECRET || '',
  path: async (_, context) => {
    const { uuid } = await context.params;
    return `/api/players/${encodeURIComponent(uuid)}/history`;
  },
  cacheMaxAge: null,
  errorMessage: 'Failed to fetch player history',
  forwardSearchParams: true,
});
