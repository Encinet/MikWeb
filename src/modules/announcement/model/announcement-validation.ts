import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { isRecord } from '@/shared/lib/is-record';

export function isAnnouncementItem(value: unknown): value is AnnouncementItem {
  return (
    isRecord(value) && typeof value.content === 'string' && typeof value.timestamp === 'string'
  );
}

export function isAnnouncementItemArray(value: unknown): value is AnnouncementItem[] {
  return Array.isArray(value) && value.every(isAnnouncementItem);
}
