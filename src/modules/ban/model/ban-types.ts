export interface BanItem {
  playerName: string;
  playerUuid: string;
  reason: string;
  bannedBy: string;
  bannedAt: string;
  expiresAt: string | null;
  isPermanent: boolean;
}

export type BansApiResponse = BanItem[];

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isBanItem(value: unknown): value is BanItem {
  return (
    isObjectRecord(value) &&
    typeof value.playerName === 'string' &&
    typeof value.playerUuid === 'string' &&
    typeof value.reason === 'string' &&
    typeof value.bannedBy === 'string' &&
    typeof value.bannedAt === 'string' &&
    (typeof value.expiresAt === 'string' || value.expiresAt === null) &&
    typeof value.isPermanent === 'boolean'
  );
}

export function isBanItemArray(value: unknown): value is BanItem[] {
  return Array.isArray(value) && value.every(isBanItem);
}
