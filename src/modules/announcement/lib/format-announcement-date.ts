function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function parseAnnouncementDate(timestamp: string) {
  const trimmedTimestamp = timestamp.trim();
  if (!trimmedTimestamp) {
    return null;
  }

  const normalizedTimestamp = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(trimmedTimestamp)
    ? trimmedTimestamp.replace(/\s+/, 'T')
    : trimmedTimestamp;
  const parsedTimestamp = Number(trimmedTimestamp);
  const date =
    Number.isFinite(parsedTimestamp) && trimmedTimestamp !== ''
      ? new Date(trimmedTimestamp.length <= 10 ? parsedTimestamp * 1000 : parsedTimestamp)
      : new Date(normalizedTimestamp);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatAnnouncementDate(timestamp: string, locale: string) {
  const announcementDate = parseAnnouncementDate(timestamp);

  if (!announcementDate) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: getBrowserTimeZone(),
  }).format(announcementDate);
}

export function getAnnouncementDateTimeValue(timestamp: string) {
  return parseAnnouncementDate(timestamp)?.toISOString() ?? timestamp;
}
