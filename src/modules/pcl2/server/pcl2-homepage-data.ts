import { getMessages } from 'next-intl/server';
import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { isAnnouncementItemArray } from '@/modules/announcement/model/announcement-validation';
import type { BanItem } from '@/modules/ban/model/ban-types';
import { isBanItemArray } from '@/modules/ban/model/ban-validation';
import type { Building } from '@/modules/building/model/building-types';
import { isBuildingArray } from '@/modules/building/model/building-validation';
import { echoQuotes } from '@/modules/pcl2/lib/echo-quotes';
import { getPcl2TimeZoneFromUrl } from '@/modules/pcl2/lib/pcl2-time-zone';
import type { Pcl2HomepageData } from '@/modules/pcl2/model/pcl2-homepage';
import { isPlayerStatusResponse, toPlayerStatus } from '@/modules/player/lib/player-status-api';
import type { PlayerStatus } from '@/modules/player/model/player-types';
import { dataApiUrl } from '@/shared/api/data-api-url';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';
import { MINECRAFT_SERVER_ADDRESS } from '@/shared/config/site-config';
import type { AppLocale } from '@/shared/i18n/routing';
import { getRequestOriginFromRequest } from '@/shared/url/request-url';

interface Pcl2HomepageApiData {
  announcements: AnnouncementItem[];
  bans: BanItem[] | null;
  buildingCount: number | null;
  buildings: Building[] | null;
  onlinePlayers: PlayerStatus;
}

const FALLBACK_ONLINE_PLAYERS: PlayerStatus = {
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

async function loadPcl2HomepageApiData(): Promise<Pcl2HomepageApiData> {
  const [onlinePlayers, announcements, buildings, bans] = await Promise.all([
    loadJson('/players', isPlayerStatusResponse, 'Failed to load online players'),
    loadJson('/announcements', isAnnouncementItemArray, 'Failed to load announcements'),
    loadJson('/buildings', isBuildingArray, 'Failed to load buildings'),
    loadJson('/bans', isBanItemArray, 'Failed to load bans'),
  ]);

  return {
    announcements: announcements ?? [],
    bans,
    buildingCount: buildings?.length ?? null,
    buildings,
    onlinePlayers: onlinePlayers ? toPlayerStatus(onlinePlayers) : FALLBACK_ONLINE_PLAYERS,
  };
}

export async function loadPcl2HomepageData(
  request: Request,
  locale: AppLocale,
): Promise<Pcl2HomepageData> {
  const [data, messages] = await Promise.all([loadPcl2HomepageApiData(), getMessages({ locale })]);

  return {
    ...data,
    buildingTypes: messages.buildings.types,
    description: messages.metadata.description,
    displayAddress: MINECRAFT_SERVER_ADDRESS,
    echoQuotes,
    locale,
    messages: messages.pcl2.homepage,
    serverAddress: MINECRAFT_SERVER_ADDRESS,
    siteOrigin: getRequestOriginFromRequest(request),
    timeZone: getPcl2TimeZoneFromUrl(request.url),
  };
}
