export interface AnnouncementItem {
  content: string;
  timestamp: string;
}

export type AnnouncementsApiResponse = AnnouncementItem[];

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isAnnouncementItem(value: unknown): value is AnnouncementItem {
  return (
    isObjectRecord(value) &&
    typeof value.content === 'string' &&
    typeof value.timestamp === 'string'
  );
}

export function isAnnouncementItemArray(value: unknown): value is AnnouncementItem[] {
  return Array.isArray(value) && value.every(isAnnouncementItem);
}
