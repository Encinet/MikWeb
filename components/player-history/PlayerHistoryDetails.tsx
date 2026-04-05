'use client';

import { Crosshair, Lock, TrendingUp, Users2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { HistoryActivePointInsights } from '@/lib/playerHistory';
import {
  formatHistoryPercent,
  formatHistoryPointDate,
  formatHistoryPointDelta,
  formatHistorySummaryNumber,
} from '@/lib/playerHistory';
import {
  getHistoryDeltaColor,
  getHistoryMetaPillStyle,
  getHistoryModeBadgeStyle,
  historyContextRailStyle,
  historyDetailPanelStyle,
  historyInsetPanelStyle,
  historyPlayerChipStyle,
  historyPlayerListStyle,
  historyStaleWarningStyle,
  historyStatTileStyle,
} from '@/lib/playerHistoryPresentation';
import type { PlayersHistoryPoint } from '@/lib/types';

function resolvePointStatusLabel(
  isPeakPoint: boolean,
  isLatestPoint: boolean,
  labels: {
    peak: string;
    latest: string;
    normal: string;
  },
): string {
  if (isPeakPoint) {
    return labels.peak;
  }

  if (isLatestPoint) {
    return labels.latest;
  }

  return labels.normal;
}

interface PlayerHistoryDetailsProps {
  activePoint: PlayersHistoryPoint | null;
  activePointInsights: HistoryActivePointInsights;
  isPointLocked: boolean;
  hasStaleData: boolean;
}

export default function PlayerHistoryDetails({
  activePoint,
  activePointInsights,
  isPointLocked,
  hasStaleData,
}: PlayerHistoryDetailsProps) {
  const locale = useLocale();
  const t = useTranslations('home.playerHistory');
  const formattedTimestamp = activePoint
    ? formatHistoryPointDate(locale, activePoint.timestamp)
    : '-';
  const formattedPlayerTimestamp = activePoint
    ? formatHistoryPointDate(locale, activePoint.timestamp, true)
    : '-';
  const pointStatusLabel = resolvePointStatusLabel(
    activePointInsights.isPeakPoint,
    activePointInsights.isLatestPoint,
    {
      peak: t('selectedPoint.peak'),
      latest: t('selectedPoint.latest'),
      normal: t('selectedPoint.normal'),
    },
  );

  return (
    <div style={historyDetailPanelStyle}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.95fr)]">
        <div className="min-w-0">
          <div
            style={{
              ...historyInsetPanelStyle,
              borderRadius: '18px',
              padding: '1rem 1.05rem',
              background:
                'linear-gradient(135deg, rgba(255,170,0,0.08), rgba(85,170,255,0.04) 52%, var(--theme-surface-icon) 100%)',
            }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div
                  className="flex flex-wrap items-center gap-2"
                  style={{ color: 'var(--theme-text-muted-soft)' }}
                >
                  <Users2 className="h-4 w-4" style={{ color: '#55AAFF' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {t('selectedPoint.title')}
                  </span>
                  <span style={getHistoryModeBadgeStyle(isPointLocked)}>
                    {isPointLocked ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Crosshair className="h-3.5 w-3.5" />
                    )}
                    {isPointLocked ? t('selectedPoint.locked') : t('selectedPoint.live')}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: '0.65rem',
                    color: 'var(--theme-text-heading)',
                    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                    fontWeight: 700,
                    lineHeight: 1.25,
                  }}
                >
                  {formattedTimestamp}
                </div>

                <div style={historyContextRailStyle}>
                  <span style={getHistoryMetaPillStyle('highlight')}>{pointStatusLabel}</span>
                  {activePointInsights.isPeakPoint ? (
                    <span style={getHistoryMetaPillStyle('highlight')}>
                      <TrendingUp className="h-3.5 w-3.5" />
                      {t('selectedPoint.peak')}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0 md:max-w-[18rem] md:text-right">
                <div style={{ color: 'var(--theme-text-muted)', fontSize: '0.78rem' }}>
                  {t('selectedPoint.timestampLabel')}
                </div>
                <div
                  style={{
                    marginTop: '0.18rem',
                    color: 'var(--theme-text-heading)',
                    fontWeight: 600,
                  }}
                >
                  {formattedPlayerTimestamp}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div style={historyStatTileStyle}>
              <div style={{ color: 'var(--theme-text-muted)', fontSize: '0.78rem' }}>
                {t('selectedPoint.onlineLabel')}
              </div>
              <div
                style={{
                  color: 'var(--theme-text-heading)',
                  fontWeight: 700,
                  fontSize: '1.3rem',
                }}
              >
                {activePoint ? formatHistorySummaryNumber(locale, activePoint.online) : '-'}
              </div>
            </div>

            <div style={historyStatTileStyle}>
              <div style={{ color: 'var(--theme-text-muted)', fontSize: '0.78rem' }}>
                {t('selectedPoint.pointStatusLabel')}
              </div>
              <div
                style={{
                  color: 'var(--theme-text-heading)',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}
              >
                {pointStatusLabel}
              </div>
            </div>

            <div style={historyStatTileStyle}>
              <div style={{ color: 'var(--theme-text-muted)', fontSize: '0.78rem' }}>
                {t('selectedPoint.changeLabel')}
              </div>
              <div
                style={{
                  color: getHistoryDeltaColor(activePointInsights.delta),
                  fontWeight: 700,
                  fontSize: '1.3rem',
                }}
              >
                {formatHistoryPointDelta(locale, activePointInsights.delta)}
              </div>
            </div>

            <div style={historyStatTileStyle}>
              <div style={{ color: 'var(--theme-text-muted)', fontSize: '0.78rem' }}>
                {t('selectedPoint.changeRateLabel')}
              </div>
              <div
                style={{
                  color: getHistoryDeltaColor(activePointInsights.deltaPercent),
                  fontWeight: 700,
                  fontSize: '1.3rem',
                }}
              >
                {formatHistoryPercent(locale, activePointInsights.deltaPercent)}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            ...historyInsetPanelStyle,
            borderRadius: '18px',
            background:
              'linear-gradient(180deg, var(--theme-surface-glass-light) 0%, var(--theme-surface-icon) 100%)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                style={{ color: 'var(--theme-text-heading)', fontSize: '0.92rem', fontWeight: 600 }}
              >
                {t('selectedPoint.playersLabel')}
              </div>
              <div style={{ color: 'var(--theme-text-muted)', fontSize: '0.78rem' }}>
                {formattedPlayerTimestamp}
              </div>
            </div>
            <span
              style={getHistoryMetaPillStyle(
                activePoint && activePoint.players.length > 0 ? 'highlight' : 'default',
              )}
            >
              {activePoint ? formatHistorySummaryNumber(locale, activePoint.players.length) : '0'}
            </span>
          </div>

          <div style={{ ...historyPlayerListStyle, marginTop: '0.85rem' }}>
            {activePoint && activePoint.players.length > 0 ? (
              activePoint.players.map((player) => (
                <span key={`${activePoint.timestamp}-${player}`} style={historyPlayerChipStyle}>
                  {player}
                </span>
              ))
            ) : (
              <div
                style={{
                  width: '100%',
                  padding: '0.85rem 0.95rem',
                  borderRadius: '14px',
                  border: '1px dashed var(--theme-border-glass-light)',
                  color: 'var(--theme-text-muted)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {t('selectedPoint.noPlayers')}
              </div>
            )}
          </div>
        </div>
      </div>

      {hasStaleData ? <div style={historyStaleWarningStyle}>{t('staleWarning')}</div> : null}
    </div>
  );
}
