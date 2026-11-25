import { parseAnnouncementDate } from '@/modules/announcement/lib/format-announcement-date';
import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';

interface AnnouncementDateGroup {
  key: string;
  date: Date | null;
  entries: { announcement: AnnouncementItem; date: Date | null }[];
}

export function getAnnouncementKey(announcement: AnnouncementItem) {
  return `${announcement.timestamp}:${announcement.content}`;
}

export function sortAnnouncements(announcements: AnnouncementItem[]) {
  return announcements
    .map((announcement) => ({
      announcement,
      time: parseAnnouncementDate(announcement.timestamp)?.getTime() ?? Number.NEGATIVE_INFINITY,
    }))
    .sort((left, right) => right.time - left.time)
    .map(({ announcement }) => announcement);
}

/** Group in the reader's time zone, including announcements that cross a UTC date boundary. */
export function groupAnnouncementsByDate(
  announcements: AnnouncementItem[],
  timeZone?: string,
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
    const entry = { announcement, date };
    if (group) group.entries.push(entry);
    else groups.set(key, { key, date, entries: [entry] });
  }

  return [...groups.values()];
}
