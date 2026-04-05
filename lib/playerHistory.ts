import type { PlayersHistoryPoint } from '@/lib/types';

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

export interface HistoryChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HistoryChartPoint {
  x: number;
  y: number;
  point: PlayersHistoryPoint;
}

export interface HistoryYAxisTick {
  value: number;
  y: number;
}

export interface HistoryActivePointInsights {
  samplePosition: number | null;
  totalSamples: number;
  progressRatio: number;
  isPeakPoint: boolean;
  isLatestPoint: boolean;
  delta: number | null;
  deltaPercent: number | null;
}

export interface HistoryChartModel {
  chartWidth: number;
  chartHeight: number;
  chartBottom: number;
  chartPadding: HistoryChartPadding;
  plotWidth: number;
  points: HistoryChartPoint[];
  linePath: string;
  areaPath: string;
  yAxisTicks: HistoryYAxisTick[];
}

export interface HistoryPlayersPreview {
  visiblePlayers: string[];
  remainingPlayersCount: number;
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

const CHART_WIDTH = 760;
const CHART_HEIGHT = 280;
const CHART_PADDING: HistoryChartPadding = { top: 16, right: 16, bottom: 32, left: 40 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

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

export function buildHistoryChartModel(data: PlayersHistoryPoint[]): HistoryChartModel {
  const chartWidth = CHART_WIDTH;
  const chartHeight = CHART_HEIGHT;
  const chartPadding = CHART_PADDING;
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const chartBottom = chartHeight - chartPadding.bottom;
  const maxOnline = Math.max(1, ...data.map((point) => point.online));

  const points = data.map((point, index) => {
    const ratio = data.length === 1 ? 0.5 : index / Math.max(data.length - 1, 1);
    const x = chartPadding.left + plotWidth * ratio;
    const y = chartPadding.top + plotHeight - (point.online / maxOnline) * plotHeight;

    return { x, y, point };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${chartBottom} L ${points[0].x} ${chartBottom} Z`
      : '';

  const yAxisTicks = Array.from({ length: 5 }, (_, index) => {
    const value = Math.round((maxOnline * (4 - index)) / 4);
    const y = chartPadding.top + (plotHeight * index) / 4;

    return { value, y };
  });

  return {
    chartWidth,
    chartHeight,
    chartBottom,
    chartPadding,
    plotWidth,
    points,
    linePath,
    areaPath,
    yAxisTicks,
  };
}

export function findPeakHistoryPointIndex(data: PlayersHistoryPoint[]): number | null {
  if (data.length === 0) {
    return null;
  }

  let peakIndex = 0;

  for (let index = 1; index < data.length; index += 1) {
    if (data[index].online > data[peakIndex].online) {
      peakIndex = index;
    }
  }

  return peakIndex;
}

export function getHistoryPointDelta(
  data: PlayersHistoryPoint[],
  index: number | null,
): number | null {
  if (index === null || index <= 0 || index >= data.length) {
    return null;
  }

  return data[index].online - data[index - 1].online;
}

export function getHistoryPointDeltaPercent(
  data: PlayersHistoryPoint[],
  index: number | null,
): number | null {
  if (index === null || index <= 0 || index >= data.length) {
    return null;
  }

  const previousOnline = data[index - 1].online;

  if (previousOnline === 0) {
    return data[index].online === 0 ? 0 : null;
  }

  return ((data[index].online - previousOnline) / previousOnline) * 100;
}

export function getHistoryPlayersPreview(players: string[], limit = 4): HistoryPlayersPreview {
  const visiblePlayers = players.slice(0, limit);

  return {
    visiblePlayers,
    remainingPlayersCount: Math.max(players.length - visiblePlayers.length, 0),
  };
}

export function buildHistoryActivePointInsights(
  data: PlayersHistoryPoint[],
  index: number | null,
): HistoryActivePointInsights {
  if (index === null || index < 0 || index >= data.length) {
    return {
      samplePosition: null,
      totalSamples: data.length,
      progressRatio: 0,
      isPeakPoint: false,
      isLatestPoint: false,
      delta: null,
      deltaPercent: null,
    };
  }

  return {
    samplePosition: index + 1,
    totalSamples: data.length,
    progressRatio: data.length <= 1 ? 1 : index / (data.length - 1),
    isPeakPoint: index === findPeakHistoryPointIndex(data),
    isLatestPoint: index === data.length - 1,
    delta: getHistoryPointDelta(data, index),
    deltaPercent: getHistoryPointDeltaPercent(data, index),
  };
}

export function resolveHistoryHoverIndex(
  clientX: number,
  rect: DOMRect,
  chartModel: HistoryChartModel,
): number | null {
  if (chartModel.points.length === 0 || rect.width === 0) {
    return null;
  }

  const scaleX = chartModel.chartWidth / rect.width;
  const pointerXInChart = (clientX - rect.left) * scaleX;
  const relativeX = clamp(pointerXInChart - chartModel.chartPadding.left, 0, chartModel.plotWidth);
  const ratio = chartModel.plotWidth === 0 ? 0 : relativeX / chartModel.plotWidth;

  return Math.round(ratio * Math.max(chartModel.points.length - 1, 0));
}

export function resolveHistoryPointIndexFromClientX(
  clientX: number,
  rect: DOMRect,
  chartModel: HistoryChartModel,
): number | null {
  return resolveHistoryHoverIndex(clientX, rect, chartModel);
}

export function resolveHistoryTooltipOffset(
  anchorX: number,
  chartWidth: number,
  tooltipWidth: number,
  padding = 16,
): number {
  return clamp(anchorX - tooltipWidth / 2, padding, chartWidth - tooltipWidth - padding);
}

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

export function formatHistoryWindowDate(locale: string, timestamp: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}
