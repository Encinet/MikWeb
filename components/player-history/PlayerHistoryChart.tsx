'use client';

import { ChevronLeft, ChevronRight, Clock3, Crosshair, Lock, Unlock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';

import type { HistoryActivePointInsights, HistoryChartModel } from '@/lib/playerHistory';
import { formatHistoryPointDate } from '@/lib/playerHistory';
import {
  getHistoryActionButtonStyle,
  getHistoryProgressFillStyle,
  historyChartCardStyle,
  historyChartFrameStyle,
  historyChartHintBarStyle,
  historyProgressTrackStyle,
  resolveHistoryKeyboardAction,
} from '@/lib/playerHistoryPresentation';
import type { PlayersHistoryPayload } from '@/lib/types';

function HistoryActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof ChevronLeft;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="player-history-action-button"
      style={getHistoryActionButtonStyle()}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

interface PlayerHistoryChartProps {
  historySnapshot: PlayersHistoryPayload;
  historyChartModel: HistoryChartModel;
  activePointIndex: number | null;
  activePointInsights: HistoryActivePointInsights;
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

export default function PlayerHistoryChart({
  historySnapshot,
  historyChartModel,
  activePointIndex,
  activePointInsights,
  isPointLocked,
  updateHoveredPoint,
  clearHoveredPoint,
  toggleLockedPoint,
  toggleActivePointLock,
  stepActivePoint,
  jumpToPeakPoint,
  jumpToLatestPoint,
  clearLockedPoint,
}: PlayerHistoryChartProps) {
  const locale = useLocale();
  const t = useTranslations('home.playerHistory');
  const samplePositionLabel =
    activePointInsights.samplePosition === null
      ? '-'
      : `${activePointInsights.samplePosition} / ${activePointInsights.totalSamples}`;

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    updateHoveredPoint(event.clientX, event.currentTarget.getBoundingClientRect());
  };

  const handleChartClick = (event: MouseEvent<HTMLButtonElement>) => {
    toggleLockedPoint(event.clientX, event.currentTarget.getBoundingClientRect());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const action = resolveHistoryKeyboardAction(event.key);

    if (action === null) {
      return;
    }

    event.preventDefault();

    switch (action) {
      case 'previous-point':
        stepActivePoint(-1);
        return;
      case 'next-point':
        stepActivePoint(1);
        return;
      case 'jump-to-peak':
        jumpToPeakPoint();
        return;
      case 'jump-to-latest':
        jumpToLatestPoint();
        return;
      case 'clear-lock':
        clearLockedPoint();
        return;
      case 'toggle-lock':
        toggleActivePointLock();
        return;
      default:
        return;
    }
  };

  return (
    <div style={historyChartCardStyle}>
      <div className="flex justify-end">
        <div className="player-history-action-group">
          <HistoryActionButton
            icon={Crosshair}
            label={t('actions.peak')}
            onClick={jumpToPeakPoint}
          />
          <HistoryActionButton
            icon={Clock3}
            label={t('actions.latest')}
            onClick={jumpToLatestPoint}
          />
          <HistoryActionButton
            icon={ChevronLeft}
            label={t('actions.prev')}
            onClick={() => stepActivePoint(-1)}
          />
          <HistoryActionButton
            icon={ChevronRight}
            label={t('actions.next')}
            onClick={() => stepActivePoint(1)}
          />
          <HistoryActionButton
            icon={isPointLocked ? Unlock : Lock}
            label={isPointLocked ? t('actions.unlock') : t('actions.lock')}
            onClick={isPointLocked ? clearLockedPoint : toggleActivePointLock}
          />
        </div>
      </div>

      <div style={historyChartFrameStyle}>
        <p id="player-history-chart-hint" className="sr-only">
          {t('chart.keyboardHint')}
        </p>

        <button
          type="button"
          aria-describedby="player-history-chart-hint"
          aria-label={t('section.title')}
          aria-pressed={isPointLocked}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onClick={handleChartClick}
          onPointerLeave={clearHoveredPoint}
          onKeyDown={handleKeyDown}
          className="block w-full rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,170,0,0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          style={{
            padding: 0,
            border: 0,
            background: 'transparent',
            touchAction: 'none',
            cursor: 'crosshair',
          }}
        >
          <svg
            viewBox={`0 0 ${historyChartModel.chartWidth} ${historyChartModel.chartHeight}`}
            className="h-[250px] w-full sm:h-[280px]"
            style={{ display: 'block' }}
          >
            <title>{t('section.title')}</title>
            <desc>{t('chart.keyboardHint')}</desc>
            <defs>
              <linearGradient id="player-history-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,170,0,0.4)" />
                <stop offset="100%" stopColor="rgba(255,170,0,0)" />
              </linearGradient>
            </defs>

            {historyChartModel.yAxisTicks.map((item) => (
              <g key={`${item.value}-${item.y}`}>
                <line
                  x1={historyChartModel.chartPadding.left}
                  x2={historyChartModel.chartWidth - historyChartModel.chartPadding.right}
                  y1={item.y}
                  y2={item.y}
                  stroke="var(--theme-border-glass-light)"
                  strokeDasharray="4 6"
                />
                <text
                  x={historyChartModel.chartPadding.left - 10}
                  y={item.y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="var(--theme-text-muted)"
                >
                  {item.value}
                </text>
              </g>
            ))}

            {historyChartModel.areaPath ? (
              <path d={historyChartModel.areaPath} fill="url(#player-history-fill)" />
            ) : null}
            {historyChartModel.linePath ? (
              <path
                d={historyChartModel.linePath}
                fill="none"
                stroke="#FFAA00"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {activePointIndex !== null ? (
              <>
                <line
                  x1={historyChartModel.points[activePointIndex].x}
                  x2={historyChartModel.points[activePointIndex].x}
                  y1={historyChartModel.chartPadding.top}
                  y2={historyChartModel.chartBottom}
                  stroke={isPointLocked ? 'rgba(255,170,0,0.75)' : 'rgba(255,170,0,0.45)'}
                  strokeDasharray="4 6"
                />
                <circle
                  cx={historyChartModel.points[activePointIndex].x}
                  cy={historyChartModel.points[activePointIndex].y}
                  r={isPointLocked ? '7' : '6'}
                  fill="#FFAA00"
                  stroke="rgba(14,14,16,0.75)"
                  strokeWidth="3"
                />
              </>
            ) : null}

            <text
              x={historyChartModel.chartPadding.left}
              y={historyChartModel.chartHeight - 10}
              fontSize="12"
              fill="var(--theme-text-muted)"
            >
              {historySnapshot.data[0]
                ? formatHistoryPointDate(locale, historySnapshot.data[0].timestamp, true)
                : ''}
            </text>
            <text
              x={historyChartModel.chartWidth - historyChartModel.chartPadding.right}
              y={historyChartModel.chartHeight - 10}
              textAnchor="end"
              fontSize="12"
              fill="var(--theme-text-muted)"
            >
              {historySnapshot.data[historySnapshot.data.length - 1]
                ? formatHistoryPointDate(
                    locale,
                    historySnapshot.data[historySnapshot.data.length - 1].timestamp,
                    true,
                  )
                : ''}
            </text>
          </svg>
        </button>

        <div style={{ padding: '0 1rem 0.85rem' }}>
          <div className="mb-2 flex items-center justify-end">
            <span style={{ color: 'var(--theme-text-muted-soft)', fontSize: '0.75rem' }}>
              {samplePositionLabel}
            </span>
          </div>
          <div style={historyProgressTrackStyle}>
            <div style={getHistoryProgressFillStyle(activePointInsights.progressRatio)} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3" style={historyChartHintBarStyle}>
        <span style={{ color: 'var(--theme-text-muted)', fontSize: '0.78rem' }}>
          {t('chart.keyboardHint')}
        </span>
      </div>
    </div>
  );
}
