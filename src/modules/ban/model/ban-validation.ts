import type { BanItem } from '@/modules/ban/model/ban-types';
import { isRecord } from '@/shared/lib/is-record';

export function isBanItem(value: unknown): value is BanItem {
  return (
    isRecord(value) &&
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
