'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PlayersHistoryPayload } from '@/modules/player/model/player-types';
import { isPlayersHistoryPayload } from '@/modules/player/model/player-types';
import type {
  HistoryIntervalId,
  HistoryIntervalOption,
  HistoryRangeId,
} from '@/modules/player-history/config/history-options';
import {
  buildHistoryQueryParams,
  getAllowedHistoryIntervals,
  HISTORY_REFRESH_INTERVAL_MS,
  HISTORY_REQUEST_TIMEOUT_MS,
  resolveHistoryInterval,
  resolveHistoryRange,
} from '@/modules/player-history/config/history-options';
import type { HistoryChartModel } from '@/modules/player-history/lib/history-chart';
import {
  buildHistoryActivePointInsights,
  buildHistoryChartModel,
  findPeakHistoryPointIndex,
  resolveHistoryPointIndexFromClientX,
} from '@/modules/player-history/lib/history-chart';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';

interface UsePlayerHistoryOptions {
  errorMessage: string;
}

interface UsePlayerHistoryResult {
  selectedRangeId: HistoryRangeId;
  setSelectedRangeId: (value: HistoryRangeId) => void;
  selectedIntervalId: HistoryIntervalId;
  setSelectedIntervalId: (value: HistoryIntervalId) => void;
  allowedIntervals: ReturnType<typeof getAllowedHistoryIntervals>;
  selectedInterval: ReturnType<typeof resolveHistoryInterval>;
  historySnapshot: PlayersHistoryPayload | null;
  historyChartModel: HistoryChartModel;
  historyError: string | null;
  isHistoryLoading: boolean;
  isBackgroundRefreshing: boolean;
  activePointInsights: ReturnType<typeof buildHistoryActivePointInsights>;
  activePoint: PlayersHistoryPayload['data'][number] | null;
  activePointIndex: number | null;
  peakTime: string | null;
  isPointLocked: boolean;
  updateHoveredPoint: (clientX: number, rect: DOMRect) => void;
  clearHoveredPoint: () => void;
  toggleLockedPoint: (clientX: number, rect: DOMRect) => void;
  toggleActivePointLock: () => void;
  stepActivePoint: (offset: number) => void;
  jumpToPeakPoint: () => void;
  jumpToLatestPoint: () => void;
  clearLockedPoint: () => void;
}

export function usePlayerHistory(options: UsePlayerHistoryOptions): UsePlayerHistoryResult {
  const { errorMessage } = options;
  const requestIdRef = useRef(0);

  const [selectedRangeId, setSelectedRangeId] = useState<HistoryRangeId>('7d');
  const [selectedIntervalId, setSelectedIntervalId] = useState<HistoryIntervalId>('h1');
  const [historySnapshot, setHistorySnapshot] = useState<PlayersHistoryPayload | null>(null);
  const [historyChartModel, setHistoryChartModel] = useState<HistoryChartModel>(() =>
    buildHistoryChartModel([]),
  );
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [lockedPointIndex, setLockedPointIndex] = useState<number | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);

  const selectedRange = resolveHistoryRange(selectedRangeId);
  const allowedIntervals = getAllowedHistoryIntervals(selectedRange);
  const selectedInterval = resolveHistoryInterval(selectedIntervalId, allowedIntervals);

  const updateSelectedRangeId = useCallback((nextRangeId: HistoryRangeId) => {
    const nextRange = resolveHistoryRange(nextRangeId);
    const nextAllowedIntervals = getAllowedHistoryIntervals(nextRange);

    setSelectedRangeId(nextRangeId);
    setSelectedIntervalId((currentIntervalId) =>
      nextAllowedIntervals.some(
        (interval: HistoryIntervalOption) => interval.id === currentIntervalId,
      )
        ? currentIntervalId
        : nextRange.defaultIntervalId,
    );
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadHistory = async (isBackgroundRefresh: boolean) => {
      const requestId = ++requestIdRef.current;
      const params = buildHistoryQueryParams(
        selectedRange.durationMs,
        selectedInterval.intervalSeconds,
      );

      if (isBackgroundRefresh) {
        setIsBackgroundRefreshing(true);
      } else {
        setIsHistoryLoading(true);
      }

      const result = await fetchValidatedJson({
        url: `/api/players/history?${params.toString()}`,
        validate: isPlayersHistoryPayload,
        timeoutMs: HISTORY_REQUEST_TIMEOUT_MS,
        cache: 'no-store',
        fallbackErrorMessage: 'Failed to load player history',
        invalidDataMessage: 'Invalid player history format',
      });

      if (isCancelled || requestId !== requestIdRef.current) {
        return;
      }

      if (result.status === 'success') {
        setHistorySnapshot(result.data);
        setHistoryChartModel(buildHistoryChartModel(result.data.data));
        setHistoryError(null);
        setHoveredPointIndex(null);
        setLockedPointIndex((currentLockedIndex) => {
          if (currentLockedIndex === null) {
            return null;
          }

          return Math.min(currentLockedIndex, Math.max(result.data.data.length - 1, 0));
        });
      } else {
        if (result.status === 'network-error') {
          console.error('Failed to fetch player history:', result.cause);
        }

        setHistoryError(errorMessage);
      }

      setIsHistoryLoading(false);
      setIsBackgroundRefreshing(false);
    };

    loadHistory(false);

    const refreshTimer = window.setInterval(() => {
      loadHistory(true);
    }, HISTORY_REFRESH_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [errorMessage, selectedInterval.intervalSeconds, selectedRange.durationMs]);

  const points = historySnapshot?.data ?? [];
  const activePointIndex =
    points.length > 0 ? (lockedPointIndex ?? hoveredPointIndex ?? points.length - 1) : null;
  const activePoint = activePointIndex === null ? null : points[activePointIndex];
  const activePointInsights = buildHistoryActivePointInsights(points, activePointIndex);
  const peakTime = historySnapshot?.summary.peak_time ?? null;
  const isPointLocked = lockedPointIndex !== null;

  const updateHoveredPoint = (clientX: number, rect: DOMRect) => {
    if (lockedPointIndex !== null) {
      return;
    }

    const nextIndex = resolveHistoryPointIndexFromClientX(clientX, rect, historyChartModel);

    if (nextIndex === null) {
      return;
    }

    setHoveredPointIndex((previousIndex) =>
      previousIndex === nextIndex ? previousIndex : nextIndex,
    );
  };

  const clearHoveredPoint = () => {
    if (lockedPointIndex !== null) {
      return;
    }

    setHoveredPointIndex(null);
  };

  const toggleLockedPoint = (clientX: number, rect: DOMRect) => {
    const nextIndex = resolveHistoryPointIndexFromClientX(clientX, rect, historyChartModel);

    if (nextIndex === null) {
      return;
    }

    setLockedPointIndex((currentLockedIndex) =>
      currentLockedIndex === nextIndex ? null : nextIndex,
    );
    setHoveredPointIndex(null);
  };

  const toggleActivePointLock = () => {
    if (activePointIndex === null) {
      return;
    }

    setLockedPointIndex((currentLockedIndex) =>
      currentLockedIndex === activePointIndex ? null : activePointIndex,
    );
    setHoveredPointIndex(null);
  };

  const stepActivePoint = (offset: number) => {
    if (points.length === 0) {
      return;
    }

    const baseIndex = activePointIndex ?? points.length - 1;
    const nextIndex = Math.min(Math.max(baseIndex + offset, 0), points.length - 1);

    setLockedPointIndex(nextIndex);
    setHoveredPointIndex(null);
  };

  const jumpToPeakPoint = () => {
    const peakIndex = findPeakHistoryPointIndex(points);

    if (peakIndex === null) {
      return;
    }

    setLockedPointIndex(peakIndex);
    setHoveredPointIndex(null);
  };

  const jumpToLatestPoint = () => {
    if (points.length === 0) {
      return;
    }

    setLockedPointIndex(points.length - 1);
    setHoveredPointIndex(null);
  };

  const clearLockedPoint = () => {
    setLockedPointIndex(null);
  };

  return {
    selectedRangeId,
    setSelectedRangeId: updateSelectedRangeId,
    selectedIntervalId,
    setSelectedIntervalId,
    allowedIntervals,
    selectedInterval,
    historySnapshot,
    historyChartModel,
    historyError,
    isHistoryLoading,
    isBackgroundRefreshing,
    activePointInsights,
    activePoint,
    activePointIndex,
    peakTime,
    isPointLocked,
    updateHoveredPoint,
    clearHoveredPoint,
    toggleLockedPoint,
    toggleActivePointLock,
    stepActivePoint,
    jumpToPeakPoint,
    jumpToLatestPoint,
    clearLockedPoint,
  };
}
