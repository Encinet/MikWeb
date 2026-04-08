export function formatAnnouncementDate(timestamp: string, locale: string) {
  const announcementDate = new Date(timestamp);

  return announcementDate.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
