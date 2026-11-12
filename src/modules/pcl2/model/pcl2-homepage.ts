import type { Messages } from 'next-intl';
import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import type { BanItem } from '@/modules/ban/model/ban-types';
import type { Building } from '@/modules/building/model/building-types';
import type { EchoQuote } from '@/modules/pcl2/model/echo-quote';
import type { PlayerStatus } from '@/modules/player/model/player-types';
import type { AppLocale } from '@/shared/i18n/routing';

export interface Pcl2HomepageData {
  announcements: AnnouncementItem[];
  bans: BanItem[] | null;
  buildingCount: number | null;
  buildings: Building[] | null;
  buildingTypes: Messages['buildings']['types'];
  description: string;
  echoQuotes: EchoQuote[];
  locale: AppLocale;
  messages: Messages['pcl2']['homepage'];
  onlinePlayers: PlayerStatus;
  siteOrigin: string;
  serverAddress: string;
  displayAddress: string;
  timeZone: string;
}
