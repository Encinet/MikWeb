'use client';

import { Activity, BarChart3, Clock3, SlidersHorizontal, TrendingUp, Users2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent, CSSProperties } from 'react';

import PlayerHistoryChart from '@/components/player-history/PlayerHistoryChart';
import PlayerHistoryDetails from '@/components/player-history/PlayerHistoryDetails';
import { usePlayerContext } from '@/hooks/usePlayerContext';
import { usePlayerHistory } from '@/hooks/usePlayerHistory';
import { homeGlassCardStyle } from '@/lib/homeCardStyles';
import {
  estimateHistorySampleCount,
  formatHistoryPointDate,
  formatHistorySummaryNumber,
  HISTORY_RANGE_OPTIONS,
} from '@/lib/playerHistory';
import {
  getHistoryControlButtonStyle,
  historyInsetPanelStyle,
} from '@/lib/playerHistoryPresentation';

import ScrollReveal from './ScrollReveal';

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

function HistoryToolbarBadge({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'highlight';
}) {
  return (
    <div
      className="player-history-toolbar-badge"
      style={{
        borderColor:
          tone === 'highlight' ? 'rgba(255, 170, 0, 0.22)' : 'var(--theme-border-glass-light)',
        background:
          tone === 'highlight'
            ? 'linear-gradient(135deg, rgba(255,170,0,0.12), rgba(85,170,255,0.06))'
            : 'var(--theme-surface-icon)',
      }}
    >
      <span style={{ color: 'var(--theme-text-muted)', fontSize: '0.72rem' }}>{label}</span>
      <span
        style={{
          color:
            tone === 'highlight' ? 'var(--theme-accent-amber-strong)' : 'var(--theme-text-heading)',
          fontSize: '0.92rem',
          fontWeight: 700,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function HistorySummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  hint: string;
  color: string;
}) {
  return (
    <div
      className="player-history-summary-card"
      style={{ '--player-history-accent': color } as CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div style={{ color: 'var(--theme-text-muted-soft)', fontSize: '0.8rem' }}>{label}</div>
          <div
            style={{
              marginTop: '0.65rem',
              color: 'var(--theme-text-heading)',
              fontSize: 'clamp(1.3rem, 2vw, 1.7rem)',
              fontWeight: 700,
              lineHeight: 1.05,
            }}
          >
            {value}
          </div>
        </div>
        <div
          style={{
            width: '2.6rem',
            height: '2.6rem',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: `color-mix(in srgb, ${color} 16%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 26%, transparent)`,
            color,
          }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div style={{ marginTop: '0.9rem', color: 'var(--theme-text-muted)', fontSize: '0.78rem' }}>
        {hint}
      </div>
    </div>
  );
}

export default function PlayerHistoryPanel() {
  const t = useTranslations('home.playerHistory');
  const locale = useLocale();
  const {
    playerCount,
    isLoading: isOnlineLoading,
    networkError: hasOnlineError,
  } = usePlayerContext();
  const {
    selectedRangeId,
    setSelectedRangeId,
    setSelectedIntervalId,
    allowedIntervals,
    selectedInterval,
    historySnapshot,
    historyChartModel,
    historyError,
    isHistoryLoading,
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
  } = usePlayerHistory({
    errorMessage: t('states.error'),
  });

  const rangeLabel = (rangeId: (typeof HISTORY_RANGE_OPTIONS)[number]['id']) =>
    t(`controls.ranges.${rangeId}`);
  const intervalLabel = (intervalId: (typeof selectedInterval)['id']) =>
    t(`controls.intervals.${intervalId}`);
  const precisionScale = allowedIntervals;
  const finestInterval = precisionScale[0];
  const coarsestInterval = precisionScale[precisionScale.length - 1];
  const selectedPrecisionIndex = Math.max(
    precisionScale.findIndex((interval) => interval.id === selectedInterval.id),
    0,
  );
  const selectedPrecisionProgress =
    precisionScale.length <= 1 ? 100 : (selectedPrecisionIndex / (precisionScale.length - 1)) * 100;
  const estimatedSamples = estimateHistorySampleCount(
    HISTORY_RANGE_OPTIONS.find((range) => range.id === selectedRangeId)?.durationMs ?? 0,
    selectedInterval.durationMs,
  );
  const formattedEstimatedSamples = formatHistorySummaryNumber(locale, estimatedSamples);
  const liveNowValue =
    isOnlineLoading || hasOnlineError ? '-' : formatHistorySummaryNumber(locale, playerCount);

  const handlePrecisionSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextInterval = precisionScale[Number(event.currentTarget.value)];

    if (!nextInterval || nextInterval.id === selectedInterval.id) {
      return;
    }

    setSelectedIntervalId(nextInterval.id);
  };

  const summaryCards = historySnapshot
    ? [
        {
          icon: TrendingUp,
          label: t('summary.peakOnline'),
          value: formatHistorySummaryNumber(locale, historySnapshot.summary.peak_online),
          hint: peakTime ? formatHistoryPointDate(locale, peakTime, true) : t('summary.noData'),
          color: '#FFAA00',
        },
        {
          icon: Activity,
          label: t('summary.averageOnline'),
          value: formatHistorySummaryNumber(locale, historySnapshot.summary.avg_online, 1),
          hint: t('summary.perSample'),
          color: '#55AAFF',
        },
        {
          icon: Users2,
          label: t('summary.uniquePlayers'),
          value: formatHistorySummaryNumber(locale, historySnapshot.summary.total_unique_players),
          hint: t('summary.inWindow'),
          color: 'var(--theme-accent-green-strong)',
        },
      ]
    : [];

  return (
    <ScrollReveal direction="up">
      <section
        className="player-history-panel"
        style={{
          ...homeGlassCardStyle,
          padding: 'clamp(1.25rem, 3vw, 2.1rem)',
          marginBottom: 'clamp(3rem, 6vw, 4.5rem)',
          overflow: 'hidden',
          position: 'relative',
          isolation: 'isolate',
        }}
      >
        <div className="player-history-panel-glow" aria-hidden="true" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: '3.1rem',
                  height: '3.1rem',
                  borderRadius: '18px',
                  backdropFilter: 'blur(18px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(18px) saturate(150%)',
                  background:
                    'linear-gradient(145deg, rgba(255, 170, 0, 0.22), rgba(85, 170, 255, 0.12))',
                  border: '1px solid rgba(255, 170, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 12px 28px rgba(255, 170, 0, 0.1)',
                }}
              >
                <BarChart3 className="h-5 w-5" style={{ color: '#FFAA00' }} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 'clamp(1.45rem, 3vw, 1.9rem)',
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    color: 'var(--theme-text-heading)',
                    lineHeight: 1.1,
                  }}
                >
                  {t('section.title')}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <HistoryToolbarBadge label={t('section.liveNow')} value={liveNowValue} />
            </div>
          </div>

          {historySnapshot ? (
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {summaryCards.map((item) => (
                <HistorySummaryCard
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                  hint={item.hint}
                  color={item.color}
                />
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(22rem,0.95fr)]">
            <div className="min-w-0">
              {isHistoryLoading && !historySnapshot ? (
                <div className="player-history-state-card py-14 text-center">
                  <div
                    style={{
                      display: 'inline-block',
                      width: '36px',
                      height: '36px',
                      border: '4px solid rgba(255, 170, 0, 0.25)',
                      borderTop: '4px solid #FFAA00',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <p style={{ color: 'var(--theme-text-muted)', marginTop: '1rem' }}>
                    {t('states.loading')}
                  </p>
                </div>
              ) : !historySnapshot ? (
                <div
                  className="player-history-state-card"
                  style={{
                    ...historyInsetPanelStyle,
                    padding: '1.35rem',
                    borderRadius: '22px',
                    color: historyError ? 'var(--theme-accent-red)' : 'var(--theme-text-muted)',
                  }}
                >
                  {historyError ?? t('states.empty')}
                </div>
              ) : (
                <PlayerHistoryChart
                  historySnapshot={historySnapshot}
                  historyChartModel={historyChartModel}
                  activePointIndex={activePointIndex}
                  activePointInsights={activePointInsights}
                  isPointLocked={isPointLocked}
                  updateHoveredPoint={updateHoveredPoint}
                  clearHoveredPoint={clearHoveredPoint}
                  toggleLockedPoint={toggleLockedPoint}
                  toggleActivePointLock={toggleActivePointLock}
                  stepActivePoint={stepActivePoint}
                  jumpToPeakPoint={jumpToPeakPoint}
                  jumpToLatestPoint={jumpToLatestPoint}
                  clearLockedPoint={clearLockedPoint}
                />
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              {historySnapshot ? (
                <PlayerHistoryDetails
                  activePoint={activePoint}
                  activePointInsights={activePointInsights}
                  isPointLocked={isPointLocked}
                  hasStaleData={historyError !== null}
                  compact
                />
              ) : null}
            </div>
          </div>

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
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {t('controls.rangeLabel')}
                      </span>
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
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                            {t('controls.precisionLabel')}
                          </span>
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
                          {t('controls.precisionEstimate', { count: formattedEstimatedSamples })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max={Math.max(precisionScale.length - 1, 0)}
                  step="1"
                  value={selectedPrecisionIndex}
                  onChange={handlePrecisionSliderChange}
                  aria-label={t('controls.precisionLabel')}
                  aria-valuetext={`${intervalLabel(selectedInterval.id)} · ${t(
                    'controls.precisionEstimate',
                    {
                      count: formattedEstimatedSamples,
                    },
                  )}`}
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
                    {t('controls.precisionScale.overview')} / {t('controls.precisionScale.detail')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
