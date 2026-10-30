import type { BanItem } from '@/modules/ban/model/ban-types';

export const BANS_PAGE_SIZE = 24;

export function getBanKey(entry: BanItem): string {
  return JSON.stringify([entry.playerUuid, entry.bannedAt, entry.bannedBy, entry.reason]);
}

export function filterBanEntries(entries: BanItem[], query: string): BanItem[] {
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries
    .filter((entry) => {
      const searchable = [entry.playerName, entry.playerUuid, entry.reason, entry.bannedBy]
        .join(' ')
        .toLocaleLowerCase();
      return tokens.every((token) => searchable.includes(token));
    })
    .sort((left, right) => {
      const leftTime = Date.parse(left.bannedAt);
      const rightTime = Date.parse(right.bannedAt);
      return (
        (Number.isFinite(rightTime) ? rightTime : Number.NEGATIVE_INFINITY) -
        (Number.isFinite(leftTime) ? leftTime : Number.NEGATIVE_INFINITY)
      );
    });
}
