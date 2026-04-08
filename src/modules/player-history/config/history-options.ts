export type HistoryRangeId = '24h' | '3d' | '7d' | '30d';
export type HistoryIntervalId =
  | 'm2'
  | 'm3'
  | 'm4'
  | 'm5'
  | 'm6'
  | 'm8'
  | 'm10'
  | 'm12'
  | 'm15'
  | 'm20'
  | 'm30'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h6'
  | 'h12'
  | 'd1';

export interface HistoryRangeOption {
  id: HistoryRangeId;
  durationMs: number;
  defaultIntervalId: HistoryIntervalOption['id'];
}

export interface HistoryIntervalOption {
  id: HistoryIntervalId;
  intervalSeconds: number;
  durationMs: number;
}

export const HISTORY_RANGE_OPTIONS: HistoryRangeOption[] = [
  { id: '24h', durationMs: 24 * 60 * 60 * 1000, defaultIntervalId: 'm10' },
  { id: '3d', durationMs: 3 * 24 * 60 * 60 * 1000, defaultIntervalId: 'h1' },
  { id: '7d', durationMs: 7 * 24 * 60 * 60 * 1000, defaultIntervalId: 'h1' },
  { id: '30d', durationMs: 30 * 24 * 60 * 60 * 1000, defaultIntervalId: 'h6' },
];

export const HISTORY_INTERVAL_OPTIONS: HistoryIntervalOption[] = [
  { id: 'm2', intervalSeconds: 2 * 60, durationMs: 2 * 60 * 1000 },
  { id: 'm3', intervalSeconds: 3 * 60, durationMs: 3 * 60 * 1000 },
  { id: 'm4', intervalSeconds: 4 * 60, durationMs: 4 * 60 * 1000 },
  { id: 'm5', intervalSeconds: 5 * 60, durationMs: 5 * 60 * 1000 },
  { id: 'm6', intervalSeconds: 6 * 60, durationMs: 6 * 60 * 1000 },
  { id: 'm8', intervalSeconds: 8 * 60, durationMs: 8 * 60 * 1000 },
  { id: 'm10', intervalSeconds: 10 * 60, durationMs: 10 * 60 * 1000 },
  { id: 'm12', intervalSeconds: 12 * 60, durationMs: 12 * 60 * 1000 },
  { id: 'm15', intervalSeconds: 15 * 60, durationMs: 15 * 60 * 1000 },
  { id: 'm20', intervalSeconds: 20 * 60, durationMs: 20 * 60 * 1000 },
  { id: 'm30', intervalSeconds: 30 * 60, durationMs: 30 * 60 * 1000 },
  { id: 'h1', intervalSeconds: 60 * 60, durationMs: 60 * 60 * 1000 },
  { id: 'h2', intervalSeconds: 2 * 60 * 60, durationMs: 2 * 60 * 60 * 1000 },
  { id: 'h3', intervalSeconds: 3 * 60 * 60, durationMs: 3 * 60 * 60 * 1000 },
  { id: 'h4', intervalSeconds: 4 * 60 * 60, durationMs: 4 * 60 * 60 * 1000 },
  { id: 'h6', intervalSeconds: 6 * 60 * 60, durationMs: 6 * 60 * 60 * 1000 },
  { id: 'h12', intervalSeconds: 12 * 60 * 60, durationMs: 12 * 60 * 60 * 1000 },
  { id: 'd1', intervalSeconds: 24 * 60 * 60, durationMs: 24 * 60 * 60 * 1000 },
];

export const HISTORY_REQUEST_TIMEOUT_MS = 15_000;
export const HISTORY_REFRESH_INTERVAL_MS = 60_000;

export function getAllowedHistoryIntervals(_range: HistoryRangeOption): HistoryIntervalOption[] {
  return HISTORY_INTERVAL_OPTIONS;
}

export function resolveHistoryRange(
  rangeId: HistoryRangeId,
  ranges: HistoryRangeOption[] = HISTORY_RANGE_OPTIONS,
): HistoryRangeOption {
  return ranges.find((range) => range.id === rangeId) ?? ranges[0];
}

export function resolveHistoryInterval(
  intervalId: HistoryIntervalId,
  allowedIntervals: HistoryIntervalOption[],
): HistoryIntervalOption {
  return allowedIntervals.find((interval) => interval.id === intervalId) ?? allowedIntervals[0];
}

export function buildHistoryQueryParams(
  rangeDurationMs: number,
  intervalSeconds: number,
): URLSearchParams {
  const to = new Date();
  const from = new Date(to.getTime() - rangeDurationMs);

  return new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    interval: String(intervalSeconds),
  });
}

export function estimateHistorySampleCount(
  rangeDurationMs: number,
  intervalDurationMs: number,
): number {
  return Math.max(1, Math.ceil(rangeDurationMs / intervalDurationMs));
}
