import { parseAnnouncementDate } from '@/modules/announcement/lib/format-announcement-date';
import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';

export interface AnnouncementDateGroup {
  key: string;
  date: Date | null;
  announcements: AnnouncementItem[];
}

export function getAnnouncementKey(announcement: AnnouncementItem) {
  return `${announcement.timestamp}:${announcement.content}`;
}

export function sortAnnouncements(announcements: AnnouncementItem[]) {
  return [...announcements].sort(
    (left, right) =>
      (parseAnnouncementDate(right.timestamp)?.getTime() ?? Number.NEGATIVE_INFINITY) -
      (parseAnnouncementDate(left.timestamp)?.getTime() ?? Number.NEGATIVE_INFINITY),
  );
}

/** Group in the reader's time zone, including announcements that cross a UTC date boundary. */
export function groupAnnouncementsByDate(
  announcements: AnnouncementItem[],
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const groups = new Map<string, AnnouncementDateGroup>();

  for (const announcement of announcements) {
    const date = parseAnnouncementDate(announcement.timestamp);
    const key = date ? formatter.format(date) : 'unknown';
    const group = groups.get(key);
    if (group) group.announcements.push(announcement);
    else groups.set(key, { key, date, announcements: [announcement] });
  }

  return [...groups.values()];
}
