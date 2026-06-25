import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { isAnnouncementItemArray } from '@/modules/announcement/model/announcement-types';
import { isBuildingArray } from '@/modules/building/model/building-types';
import { buildPcl2HomepageXml } from '@/modules/pcl2/lib/pcl2-homepage-xml';
import type {
  PlayerOnlinePayload,
  PlayersHistoryPayload,
  PlayersHistorySummary,
} from '@/modules/player/model/player-types';
import {
  isPlayerOnlinePayload,
  isPlayersHistoryPayload,
} from '@/modules/player/model/player-types';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';

export const dynamic = 'force-dynamic';

interface Pcl2HomepageApiData {
  announcements: AnnouncementItem[];
  buildingCount: number | null;
  historySummary: PlayersHistorySummary | null;
  onlinePlayers: PlayerOnlinePayload;
}

const FALLBACK_ONLINE_PLAYERS: PlayerOnlinePayload = {
  online: -1,
  players: [],
};

function apiUrl(request: Request, pathname: string): string {
  return new URL(pathname, request.url).href;
}

async function loadJson<TData>(
  request: Request,
  pathname: string,
  validate: (value: unknown) => value is TData,
  fallbackErrorMessage: string,
) {
  const result = await fetchValidatedJson({
    url: apiUrl(request, pathname),
    validate,
    timeoutMs: 8_000,
    cache: 'no-store',
    fallbackErrorMessage,
  });

  if (result.status === 'success') {
    return result.data;
  }

  if (result.status === 'network-error') {
    console.error(result.error, result.cause);
  } else {
    console.error(result.error);
  }

  return null;
}

async function loadPcl2HomepageData(request: Request): Promise<Pcl2HomepageApiData> {
  const [onlinePlayers, announcements, history, buildings] = await Promise.all([
    loadJson(
      request,
      '/api/players/online',
      isPlayerOnlinePayload,
      'Failed to load online players',
    ),
    loadJson(
      request,
      '/api/announcements',
      isAnnouncementItemArray,
      'Failed to load announcements',
    ),
    loadJson(
      request,
      '/api/players/history',
      isPlayersHistoryPayload,
      'Failed to load player history',
    ),
    loadJson(request, '/api/buildings', isBuildingArray, 'Failed to load buildings'),
  ]);

  return {
    announcements: announcements ?? [],
    buildingCount: buildings?.length ?? null,
    historySummary: (history as PlayersHistoryPayload | null)?.summary ?? null,
    onlinePlayers: onlinePlayers ?? FALLBACK_ONLINE_PLAYERS,
  };
}

export async function GET(request: Request) {
  const data = await loadPcl2HomepageData(request);
  const serverAddress = process.env.MINECRAFT_SERVER_ADDRESS || 'mcmik.top';

  return new Response(buildPcl2HomepageXml({ ...data, serverAddress }), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
