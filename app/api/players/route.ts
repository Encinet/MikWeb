import { createProxyHandler } from '@/lib/proxyRoute';

const SERVER_HOST = process.env.MINECRAFT_SERVER_ADDRESS || '';
const SERVER_PORT = process.env.MINECRAFT_SERVER_PORT || '25565';

async function fetchFallbackPlayerCount(): Promise<{ players: []; count: number }> {
  if (!SERVER_HOST) throw new Error('MINECRAFT_SERVER_ADDRESS not configured');

  // Try mcstatus.io first
  try {
    const address = SERVER_PORT !== '25565' ? `${SERVER_HOST}:${SERVER_PORT}` : SERVER_HOST;
    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${address}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.online) return { players: [], count: data.players?.online ?? 0 };
    }
  } catch { /* fall through to next */ }

  // Try mcapi.us as second fallback
  try {
    const res = await fetch(
      `https://mcapi.us/server/status?ip=${SERVER_HOST}&port=${SERVER_PORT}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.online) return { players: [], count: data.players?.now ?? 0 };
    }
  } catch { /* fall through */ }

  return { players: [], count: -1 };
}

export const GET = createProxyHandler({
  serverUrl: process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080',
  apiKey: process.env.MINECRAFT_API_KEY || '',
  path: '/api/players',
  cacheDuration: 5000,
  cacheMaxAge: 5,
  errorMessage: 'Failed to fetch player data',
  staleOnError: false,
  onError: SERVER_HOST ? fetchFallbackPlayerCount : undefined,
});
