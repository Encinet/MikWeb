import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { isAnnouncementItemArray } from '@/modules/announcement/model/announcement-types';
import { isBuildingArray } from '@/modules/building/model/building-types';
import { buildPcl2HomepageXml } from '@/modules/pcl2/lib/pcl2-homepage-xml';
import type { PlayerOnlinePayload } from '@/modules/player/model/player-types';
import { isPlayerOnlinePayload } from '@/modules/player/model/player-types';
import { dataApiUrl } from '@/shared/api/data-api-url';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';
import { isRoutingLocale } from '@/shared/i18n/routing';
import { getRequestOriginFromRequest } from '@/shared/url/request-url';

export const dynamic = 'force-dynamic';

interface Pcl2HomepageApiData {
  announcements: AnnouncementItem[];
  buildingCount: number | null;
  onlinePlayers: PlayerOnlinePayload;
}

interface RouteContext {
  params: Promise<{ locale: string }>;
}

const FALLBACK_ONLINE_PLAYERS: PlayerOnlinePayload = {
  online: -1,
  players: [],
};

async function loadJson<TData>(
  pathname: string,
  validate: (value: unknown) => value is TData,
  fallbackErrorMessage: string,
) {
  const result = await fetchValidatedJson({
    url: dataApiUrl(pathname),
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

async function loadPcl2HomepageData(): Promise<Pcl2HomepageApiData> {
  const [onlinePlayers, announcements, buildings] = await Promise.all([
    loadJson('/players', isPlayerOnlinePayload, 'Failed to load online players'),
    loadJson('/announcements', isAnnouncementItemArray, 'Failed to load announcements'),
    loadJson('/buildings', isBuildingArray, 'Failed to load buildings'),
  ]);

  return {
    announcements: announcements ?? [],
    buildingCount: buildings?.length ?? null,
    onlinePlayers: onlinePlayers ?? FALLBACK_ONLINE_PLAYERS,
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { locale: rawLocale } = await context.params;

  if (!isRoutingLocale(rawLocale)) {
    return new Response('Not Found', { status: 404 });
  }

  const serverAddress = 'mcmik.top';
  const data = await loadPcl2HomepageData();
  const siteOrigin = getRequestOriginFromRequest(request);

  return new Response(
    buildPcl2HomepageXml({ ...data, locale: rawLocale, serverAddress, siteOrigin }),
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
        'Content-Type': 'application/xml; charset=utf-8',
      },
    },
  );
}
