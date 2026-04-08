import type { PlayerOnlinePayload } from '@/modules/player/model/player-types';
import { createProxyHandler } from '@/shared/api/proxy-route';

const SERVER_HOST = process.env.MINECRAFT_SERVER_ADDRESS || '';
const SERVER_PORT = process.env.MINECRAFT_SERVER_PORT || '25565';
const ONLINE_PLAYERS_RUNTIME_CACHE_MAX_AGE = 5;
const ONLINE_PLAYERS_RUNTIME_CACHE_STALE_WHILE_REVALIDATE = 15;

async function fetchFallbackPlayerCount(): Promise<PlayerOnlinePayload> {
  if (!SERVER_HOST) throw new Error('MINECRAFT_SERVER_ADDRESS not configured');

  // Try mcstatus.io first.
  try {
    const address = SERVER_PORT !== '25565' ? `${SERVER_HOST}:${SERVER_PORT}` : SERVER_HOST;
    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${address}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.online) return { players: [], online: data.players?.online ?? 0 };
    }
  } catch {
    /* fall through to next */
  }

  // Try mcapi.us as second fallback.
  try {
    const res = await fetch(
      `https://mcapi.us/server/status?ip=${SERVER_HOST}&port=${SERVER_PORT}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.online) return { players: [], online: data.players?.now ?? 0 };
    }
  } catch {
    /* fall through */
  }

  return { players: [], online: -1 };
}

export const GET = createProxyHandler<PlayerOnlinePayload>({
  serverUrl: process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080',
  totpSecret: process.env.TOTP_SECRET || '',
  path: '/api/players/online',
  cacheMaxAge: null,
  runtimeCacheMaxAge: ONLINE_PLAYERS_RUNTIME_CACHE_MAX_AGE,
  runtimeCacheStaleWhileRevalidate: ONLINE_PLAYERS_RUNTIME_CACHE_STALE_WHILE_REVALIDATE,
  errorMessage: 'Failed to fetch player data',
  onError: SERVER_HOST ? fetchFallbackPlayerCount : undefined,
});
