export const DEFAULT_PCL2_TIME_ZONE = 'UTC';
export const PCL2_TIME_ZONE_PARAM = 'timezone';

const MAX_PCL2_TIME_ZONE_LENGTH = 100;
const FIXED_OFFSET_PATTERN = /^[+-]\d{2}(?::?\d{2})?$/;
const timeFormatters = new Map<string, Intl.DateTimeFormat>();

export function normalizePcl2TimeZone(value: string | null | undefined): string {
  const candidate = value?.trim();

  if (
    !candidate ||
    candidate.length > MAX_PCL2_TIME_ZONE_LENGTH ||
    FIXED_OFFSET_PATTERN.test(candidate)
  ) {
    return DEFAULT_PCL2_TIME_ZONE;
  }

  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: candidate }).resolvedOptions().timeZone;
  } catch {
    return DEFAULT_PCL2_TIME_ZONE;
  }
}

export function getPcl2TimeZoneFromUrl(url: string | URL): string {
  const parsedUrl = typeof url === 'string' ? new URL(url) : url;
  return normalizePcl2TimeZone(parsedUrl.searchParams.get(PCL2_TIME_ZONE_PARAM));
}

export function withPcl2TimeZone(url: string, timeZone: string): string {
  const normalized = normalizePcl2TimeZone(timeZone);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${PCL2_TIME_ZONE_PARAM}=${normalized}`;
}

export function formatPcl2Time(timestamp: string | null | undefined, timeZone: string): string {
  if (!timestamp) {
    return '?';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const formatter = getTimeFormatter(normalizePcl2TimeZone(timeZone));
  let year = '';
  let month = '';
  let day = '';
  let hour = '';
  let minute = '';

  for (const part of formatter.formatToParts(date)) {
    switch (part.type) {
      case 'year':
        year = part.value;
        break;
      case 'month':
        month = part.value;
        break;
      case 'day':
        day = part.value;
        break;
      case 'hour':
        hour = part.value;
        break;
      case 'minute':
        minute = part.value;
        break;
    }
  }

  return `${year}/${month}/${day} ${hour}:${minute}`;
}

function getTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  const cachedFormatter = timeFormatters.get(timeZone);
  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.DateTimeFormat('en-US-u-nu-latn', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  });
  timeFormatters.set(timeZone, formatter);
  return formatter;
}
