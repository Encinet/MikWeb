'use client';

import { Activity, BarChart3, TrendingUp, Users2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { usePlayerStatus } from '@/modules/player/model/use-player-status';
import {
  estimateHistorySampleCount,
  HISTORY_RANGE_OPTIONS,
} from '@/modules/player-history/config/history-options';
import {
  formatHistoryPointDate,
  formatHistorySummaryNumber,
} from '@/modules/player-history/lib/history-formatters';
import { usePlayerHistory } from '@/modules/player-history/model/use-player-history';
import { PlayerHistoryControls } from '@/modules/player-history/ui/player-history-controls';
import { historyInsetPanelStyle } from '@/modules/player-history/ui/player-history-panel-styles';
import ScrollReveal from '@/shared/ui/motion/scroll-reveal';
import PlayerHistoryChart from './player-history-chart';
import PlayerHistoryDetails from './player-history-details';
import type { PlayerHistorySummaryCardItem } from './player-history-summary-grid';
import { PlayerHistorySummaryGrid } from './player-history-summary-grid';
import { PlayerHistoryToolbarBadge } from './player-history-toolbar-badge';

export default function PlayerHistoryPanel() {
  const t = useTranslations('home.playerHistory');
  const locale = useLocale();
  const {
    playerCount,
    isLoading: isOnlineLoading,
    networkError: hasOnlineError,
  } = usePlayerStatus();
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
  const estimatedSamples = estimateHistorySampleCount(
    HISTORY_RANGE_OPTIONS.find((range) => range.id === selectedRangeId)?.durationMs ?? 0,
    selectedInterval.durationMs,
  );
  const formattedEstimatedSamples = formatHistorySummaryNumber(locale, estimatedSamples);
  const liveNowValue =
    isOnlineLoading || hasOnlineError ? '-' : formatHistorySummaryNumber(locale, playerCount);

  const summaryCards: PlayerHistorySummaryCardItem[] = historySnapshot
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
        className="ui-card-surface player-history-panel"
        style={{
          padding: 'clamp(1.25rem, 3vw, 2.1rem)',
          marginBottom: 'clamp(3rem, 6vw, 4.5rem)',
          overflow: 'hidden',
        }}
      >
        <div className="player-history-panel-glow" aria-hidden="true" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="ui-card-icon-surface"
                style={{
                  width: '3.1rem',
                  height: '3.1rem',
                  borderRadius: '18px',
                  background:
                    'linear-gradient(145deg, rgba(255, 170, 0, 0.22), rgba(85, 170, 255, 0.12))',
                  border: '1px solid rgba(255, 170, 0, 0.2)',
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
              <PlayerHistoryToolbarBadge label={t('section.liveNow')} value={liveNowValue} />
            </div>
          </div>

          <PlayerHistorySummaryGrid items={summaryCards} />

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(22rem,0.95fr)]">
            <div className="min-w-0">
              {isHistoryLoading && !historySnapshot ? (
                <div className="player-history-state-card items-center py-14 text-center">
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

          <PlayerHistoryControls
            selectedRangeId={selectedRangeId}
            setSelectedRangeId={setSelectedRangeId}
            setSelectedIntervalId={setSelectedIntervalId}
            allowedIntervals={allowedIntervals}
            selectedInterval={selectedInterval}
            rangeTitle={t('controls.rangeLabel')}
            precisionTitle={t('controls.precisionLabel')}
            rangeLabel={rangeLabel}
            intervalLabel={intervalLabel}
            estimatedSamplesLabel={t('controls.precisionEstimate', {
              count: formattedEstimatedSamples,
            })}
            precisionOverviewLabel={t('controls.precisionScale.overview')}
            precisionDetailLabel={t('controls.precisionScale.detail')}
          />
        </div>
      </section>
    </ScrollReveal>
  );
}
