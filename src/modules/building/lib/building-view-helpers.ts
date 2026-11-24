export function formatBuildingDate(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
}
