'use client';

import { Clock3, SlidersHorizontal } from 'lucide-react';
import type { ChangeEvent, CSSProperties } from 'react';

import type {
  HistoryIntervalId,
  HistoryIntervalOption,
  HistoryRangeId,
} from '@/modules/player-history/config/history-options';
import { HISTORY_RANGE_OPTIONS } from '@/modules/player-history/config/history-options';
import {
  getHistoryControlButtonStyle,
  historyInsetPanelStyle,
} from '@/modules/player-history/ui/player-history-panel-styles';

function HistoryControlButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="player-history-control-button"
      style={{
        ...getHistoryControlButtonStyle(active),
        width: '100%',
        minHeight: '3rem',
        justifyContent: 'center',
      }}
    >
      {label}
    </button>
  );
}

interface PlayerHistoryControlsProps {
  selectedRangeId: HistoryRangeId;
  setSelectedRangeId: (value: HistoryRangeId) => void;
  setSelectedIntervalId: (value: HistoryIntervalId) => void;
  allowedIntervals: HistoryIntervalOption[];
  selectedInterval: HistoryIntervalOption;
  rangeTitle: string;
  precisionTitle: string;
  rangeLabel: (rangeId: HistoryRangeId) => string;
  intervalLabel: (intervalId: HistoryIntervalId) => string;
  estimatedSamplesLabel: string;
  precisionOverviewLabel: string;
  precisionDetailLabel: string;
}

export function PlayerHistoryControls({
  selectedRangeId,
  setSelectedRangeId,
  setSelectedIntervalId,
  allowedIntervals,
  selectedInterval,
  rangeTitle,
  precisionTitle,
  rangeLabel,
  intervalLabel,
  estimatedSamplesLabel,
  precisionOverviewLabel,
  precisionDetailLabel,
}: PlayerHistoryControlsProps) {
  const selectedPrecisionIndex = Math.max(
    allowedIntervals.findIndex((interval) => interval.id === selectedInterval.id),
    0,
  );
  const selectedPrecisionProgress =
    allowedIntervals.length <= 1
      ? 100
      : (selectedPrecisionIndex / (allowedIntervals.length - 1)) * 100;
  const finestInterval = allowedIntervals[0];
  const coarsestInterval = allowedIntervals[allowedIntervals.length - 1];

  const handlePrecisionSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextInterval = allowedIntervals[Number(event.currentTarget.value)];

    if (!nextInterval || nextInterval.id === selectedInterval.id) {
      return;
    }

    setSelectedIntervalId(nextInterval.id);
  };

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div
        className="player-history-control-surface"
        style={{
          ...historyInsetPanelStyle,
          borderRadius: '24px',
          padding: '1.15rem',
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="player-history-section-icon">
              <Clock3 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div
                className="flex items-center gap-2"
                style={{ color: 'var(--theme-text-muted-soft)' }}
              >
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{rangeTitle}</span>
              </div>
              <div
                style={{
                  marginTop: '0.38rem',
                  color: 'var(--theme-text-heading)',
                  fontSize: '1.08rem',
                  fontWeight: 700,
                }}
              >
                {rangeLabel(selectedRangeId)}
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {HISTORY_RANGE_OPTIONS.map((range) => (
              <HistoryControlButton
                key={range.id}
                active={range.id === selectedRangeId}
                label={rangeLabel(range.id)}
                onClick={() => setSelectedRangeId(range.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className="player-history-control-surface"
        style={{
          ...historyInsetPanelStyle,
          borderRadius: '24px',
          padding: '1.15rem',
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="player-history-section-icon">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div
                    className="flex items-center gap-2"
                    style={{ color: 'var(--theme-text-muted-soft)' }}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{precisionTitle}</span>
                  </div>
                  <div
                    style={{
                      marginTop: '0.38rem',
                      color: 'var(--theme-text-heading)',
                      fontSize: '1.08rem',
                      fontWeight: 700,
                    }}
                  >
                    {intervalLabel(selectedInterval.id)}
                  </div>
                </div>

                <div className="player-history-metric-pill self-start sm:self-auto">
                  <span style={{ color: 'var(--theme-text-muted)', fontSize: '0.78rem' }}>
                    {estimatedSamplesLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={Math.max(allowedIntervals.length - 1, 0)}
            step="1"
            value={selectedPrecisionIndex}
            onChange={handlePrecisionSliderChange}
            aria-label={intervalLabel(selectedInterval.id)}
            aria-valuetext={`${intervalLabel(selectedInterval.id)} · ${estimatedSamplesLabel}`}
            className="player-history-slider"
            style={
              {
                '--player-history-slider-fill': `${selectedPrecisionProgress}%`,
              } as CSSProperties
            }
          />

          <div
            className="grid grid-cols-2 items-center gap-x-4 gap-y-2 sm:flex sm:items-center sm:justify-between"
            style={{ color: 'var(--theme-text-muted)', fontSize: '0.76rem' }}
          >
            <span className="text-left">
              {finestInterval ? intervalLabel(finestInterval.id) : ''}
            </span>
            <span className="text-right sm:text-left">
              {coarsestInterval ? intervalLabel(coarsestInterval.id) : ''}
            </span>
            <span
              className="col-span-2 text-center sm:col-auto"
              style={{ color: 'var(--theme-text-muted-soft)' }}
            >
              {precisionOverviewLabel} / {precisionDetailLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
