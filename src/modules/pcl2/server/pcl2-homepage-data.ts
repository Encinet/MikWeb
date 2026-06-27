import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { isAnnouncementItemArray } from '@/modules/announcement/model/announcement-types';
import type { BanItem } from '@/modules/ban/model/ban-types';
import { isBanItemArray } from '@/modules/ban/model/ban-types';
import type { Building } from '@/modules/building/model/building-types';
import { isBuildingArray } from '@/modules/building/model/building-types';
import { echoQuotes } from '@/modules/pcl2/lib/echo-quotes';
import type { Pcl2HomepageData } from '@/modules/pcl2/lib/pcl2-homepage-xml';
import type { PlayerOnlinePayload } from '@/modules/player/model/player-types';
import { isPlayerOnlinePayload } from '@/modules/player/model/player-types';
import { dataApiUrl } from '@/shared/api/data-api-url';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';
import type { AppLocale } from '@/shared/i18n/routing';
import { getRequestOriginFromRequest } from '@/shared/url/request-url';

interface Pcl2HomepageApiData {
  announcements: AnnouncementItem[];
  bans: BanItem[] | null;
  buildingCount: number | null;
  buildings: Building[] | null;
  onlinePlayers: PlayerOnlinePayload;
}

const FALLBACK_ONLINE_PLAYERS: PlayerOnlinePayload = {
  online: -1,
  players: [],
};

const PCL2_SERVER_ADDRESS = 'mcmik.top';

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

async function loadPcl2HomepageApiData(): Promise<Pcl2HomepageApiData> {
  const [onlinePlayers, announcements, buildings, bans] = await Promise.all([
    loadJson('/players', isPlayerOnlinePayload, 'Failed to load online players'),
    loadJson('/announcements', isAnnouncementItemArray, 'Failed to load announcements'),
    loadJson('/buildings', isBuildingArray, 'Failed to load buildings'),
    loadJson('/bans', isBanItemArray, 'Failed to load bans'),
  ]);

  return {
    announcements: announcements ?? [],
    bans: bans as BanItem[] | null,
    buildingCount: buildings?.length ?? null,
    buildings: buildings as Building[] | null,
    onlinePlayers: onlinePlayers ?? FALLBACK_ONLINE_PLAYERS,
  };
}

export async function loadPcl2HomepageData(
  request: Request,
  locale: AppLocale,
): Promise<Pcl2HomepageData> {
  const data = await loadPcl2HomepageApiData();

  return {
    ...data,
    displayAddress: PCL2_SERVER_ADDRESS,
    echoQuotes,
    locale,
    serverAddress: PCL2_SERVER_ADDRESS,
    siteOrigin: getRequestOriginFromRequest(request),
  };
}
