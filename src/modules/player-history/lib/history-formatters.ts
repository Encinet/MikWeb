export function formatHistorySummaryNumber(
  locale: string,
  value: number,
  maximumFractionDigits = 0,
): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

export function formatHistoryPointDelta(locale: string, delta: number | null): string {
  if (delta === null) {
    return '-';
  }

  return `${delta > 0 ? '+' : ''}${formatHistorySummaryNumber(locale, delta)}`;
}

export function formatHistoryPercent(
  locale: string,
  value: number | null,
  maximumFractionDigits = 1,
): string {
  if (value === null) {
    return '-';
  }

  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale, {
    maximumFractionDigits,
  }).format(value)}%`;
}

export function formatHistoryPointDate(locale: string, timestamp: string, compact = false): string {
  return new Intl.DateTimeFormat(locale, {
    month: compact ? 'short' : 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}
