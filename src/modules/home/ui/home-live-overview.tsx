'use client';

import { ArrowRight, Building2, Clock, Server } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import {
  formatAnnouncementDate,
  getAnnouncementDateTimeValue,
} from '@/modules/announcement/lib/format-announcement-date';
import { useAnnouncementsFeed } from '@/modules/announcement/model/use-announcements-feed';
import { AnnouncementFeedDialog } from '@/modules/announcement/ui/announcement-feed-dialog';
import { useBuildings } from '@/modules/building/model/use-buildings';
import HomePlayerList from '@/modules/home/ui/home-player-list';
import { usePlayerStatus } from '@/modules/player/model/use-player-status';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { CopyButton } from '@/shared/ui/action/copy-button';

const SERVER_START_DATE = new Date('2025-07-15');

export default function HomeLiveOverview() {
  const commonT = useTranslations('common');
  const locale = useLocale();
  const t = useTranslations();
  const {
    players,
    playerCount,
    isLoading: isLoadingPlayers,
    isOnline,
    networkError: hasPlayerNetworkError,
  } = usePlayerStatus();
  const { buildingCount, fetchBuildings, lastUpdatedAt } = useBuildings();
  const [isAnnouncementsModalOpen, setIsAnnouncementsModalOpen] = useState(false);
  const [uptime, setUptime] = useState(0);

  const mounted = useHasMounted();
  const {
    announcements,
    errorMessage: announcementsErrorMessage,
    isLoading: isLoadingAnnouncements,
  } = useAnnouncementsFeed({
    fallbackErrorMessage: commonT('states.error'),
  });

  useEffect(() => {
    const calculateUptime = () => {
      const currentTimestamp = Date.now();
      const uptimeDays = Math.floor(
        (currentTimestamp - SERVER_START_DATE.getTime()) / (1000 * 60 * 60 * 24),
      );
      setUptime(uptimeDays);
    };
    calculateUptime();
    const uptimeRefreshInterval = setInterval(calculateUptime, 60000);
    return () => clearInterval(uptimeRefreshInterval);
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);
  const statusLabel = isLoadingPlayers
    ? t('home.live.status.loading')
    : hasPlayerNetworkError
      ? t('home.live.status.networkError')
      : isOnline
        ? t('home.live.status.online')
        : t('home.live.status.offline');
  const onlinePlayersValue = isLoadingPlayers || hasPlayerNetworkError ? '-' : `${playerCount}`;
  const uptimeValue = mounted && uptime > 0 ? `${uptime}` : '-';
  const showPlayerList = !isLoadingPlayers && isOnline && !hasPlayerNetworkError && players.length > 0;
  const announcementPreview = announcements.slice(0, 2);

  return (
    <>
      <div className={`home-live-grid${showPlayerList ? ' home-live-grid--has-players' : ''}`}>
        <section className="home-live-status-panel" aria-label={t('home.live.statusTitle')}>
        <div className="home-live-status-panel__main">
          <div className="home-live-status-panel__label">
            <span
              className={`home-live-status-panel__dot ${isOnline && !hasPlayerNetworkError ? 'is-online' : ''}`}
            />
            <span>{statusLabel}</span>
          </div>
          <div className="home-live-status-panel__headline">
            <strong>{onlinePlayersValue}</strong>
            <span>{t('home.live.playersOnline')}</span>
          </div>
          <div className="home-live-status-panel__address">
            <Server className="h-4 w-4" />
            <code>mcmik.top</code>
            <CopyButton className="home-live-status-panel__copy" value="mcmik.top" />
          </div>
        </div>

        <fieldset className="home-live-status-panel__metrics">
          <legend className="sr-only">{t('home.live.metricsLabel')}</legend>
          <div>
            <Building2 className="h-4 w-4" />
            <span>{t('home.stats.totalBuildings')}</span>
            <strong>{lastUpdatedAt === null ? '-' : buildingCount}</strong>
          </div>
          <div>
            <Clock className="h-4 w-4" />
            <span>{t('home.stats.uptime')}</span>
            <strong>
              {uptimeValue}
              <small>{t('home.stats.days')}</small>
            </strong>
          </div>
        </fieldset>
        </section>

        {showPlayerList ? (
          <HomePlayerList
            players={players}
            playerCount={playerCount}
            isOnline={isOnline}
            isLoading={isLoadingPlayers}
            networkError={hasPlayerNetworkError}
          />
        ) : null}
      </div>

      <section className="home-live-announcements">
        <div className="home-live-announcements__head">
          <strong>{t('home.announcements.section.title')}</strong>
          <button type="button" onClick={() => setIsAnnouncementsModalOpen(true)}>
            {t('home.announcements.actions.viewAll')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="home-live-announcements__list">
          {isLoadingAnnouncements ? (
            <p>{t('home.announcements.states.loading')}</p>
          ) : announcementsErrorMessage ? (
            <p>{announcementsErrorMessage}</p>
          ) : announcementPreview.length > 0 ? (
            announcementPreview.map((announcement) => (
              <button
                key={`${announcement.timestamp}-${announcement.content}`}
                type="button"
                onClick={() => setIsAnnouncementsModalOpen(true)}
              >
                <time dateTime={getAnnouncementDateTimeValue(announcement.timestamp)}>
                  {formatAnnouncementDate(announcement.timestamp, locale)}
                </time>
                <span>{announcement.content}</span>
              </button>
            ))
          ) : (
            <p>{t('home.announcements.states.empty')}</p>
          )}
        </div>
      </section>

      <AnnouncementFeedDialog
        announcements={announcements}
        errorMessage={announcementsErrorMessage}
        isLoading={isLoadingAnnouncements}
        isMounted={mounted}
        isOpen={isAnnouncementsModalOpen}
        onClose={() => setIsAnnouncementsModalOpen(false)}
      />
    </>
  );
}
