import type { PlayersHistoryPoint } from '@/modules/player/model/player-types';

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

const CHART_WIDTH = 760;
const CHART_HEIGHT = 280;
const CHART_PADDING: HistoryChartPadding = { top: 16, right: 16, bottom: 32, left: 40 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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
