import type { BanItem } from '@/modules/ban/model/ban-types';

export const BANS_PAGE_SIZE = 24;

export interface BanSearchEntry {
  entry: BanItem;
  searchable: string;
  time: number;
}

export function getBanKey(entry: BanItem): string {
  return JSON.stringify([entry.playerUuid, entry.bannedAt, entry.bannedBy, entry.reason]);
}

export function prepareBanSearch(entries: readonly BanItem[]): BanSearchEntry[] {
  return entries
    .map((entry) => {
      const time = Date.parse(entry.bannedAt);
      return {
        entry,
        searchable: [entry.playerName, entry.playerUuid, entry.reason, entry.bannedBy]
          .join(' ')
          .toLocaleLowerCase(),
        time: Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY,
      };
    })
    .sort((left, right) => right.time - left.time);
}

export function filterBanEntries(catalog: BanSearchEntry[], query: string): BanSearchEntry[] {
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return catalog;
  return catalog.filter(({ searchable }) => tokens.every((token) => searchable.includes(token)));
}
