'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { getAnnouncementKey } from '@/modules/announcement/lib/announcement-feed';
import {
  formatAnnouncementDate,
  getAnnouncementDateTimeValue,
} from '@/modules/announcement/lib/format-announcement-date';
import { useAnnouncementsFeed } from '@/modules/announcement/model/use-announcements-feed';
import { AnnouncementPreview } from '@/modules/announcement/ui/announcement-body';
import { AnnouncementFeedDialog } from '@/modules/announcement/ui/announcement-feed-dialog';
import HomePlayerList from '@/modules/home/ui/home-player-list';
import { HomeServerStatus } from '@/modules/home/ui/home-server-status';
import { usePlayerStatus } from '@/modules/player/model/use-player-status';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { SkeletonLine } from '@/shared/ui/feedback/async-state';

export default function HomeLiveOverview({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const t = useTranslations();
  const commonT = useTranslations('common');
  const {
    players,
    playerCount,
    isLoading: isLoadingPlayers,
    isOnline,
    networkError,
  } = usePlayerStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const mounted = useHasMounted();
  const { announcements, errorMessage, isLoading } = useAnnouncementsFeed({
    fallbackErrorMessage: commonT('states.error'),
  });
  const openAnnouncements = (key: string | null = null) => {
    setSelectedKey(key);
    setIsOpen(true);
  };

  return (
    <section id="server-updates" className="home-daily" aria-label={t('home.live.statusTitle')}>
      <HomeServerStatus />
      {children}
      <div className="home-daily-columns">
        <section className="home-live-announcements" aria-labelledby="home-announcements-title">
          <div className="home-live-announcements__head">
            <h2 id="home-announcements-title">{t('home.announcements.section.title')}</h2>
            <button type="button" aria-haspopup="dialog" onClick={() => openAnnouncements()}>
              {t('home.announcements.actions.viewAll')}
            </button>
          </div>
          <div className="home-live-announcements__list">
            {isLoading ? (
              <div className="home-announcements-loading" role="status">
                <span className="sr-only">{t('home.announcements.states.loading')}</span>
                <div aria-hidden="true">
                  <SkeletonLine width="28%" />
                  <SkeletonLine width="95%" />
                  <SkeletonLine width="72%" />
                </div>
              </div>
            ) : errorMessage ? (
              <p className="home-inline-state" role="status">
                {errorMessage}
              </p>
            ) : announcements.length > 0 ? (
              announcements.slice(0, 2).map((announcement) => (
                <button
                  key={getAnnouncementKey(announcement)}
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => openAnnouncements(getAnnouncementKey(announcement))}
                >
                  <time dateTime={getAnnouncementDateTimeValue(announcement.timestamp)}>
                    {formatAnnouncementDate(announcement.timestamp, locale)}
                  </time>
                  <AnnouncementPreview content={announcement.content} />
                </button>
              ))
            ) : (
              <p className="home-inline-state">{t('home.announcements.states.empty')}</p>
            )}
          </div>
        </section>
        <HomePlayerList
          players={players}
          playerCount={playerCount}
          isOnline={isOnline}
          isLoading={isLoadingPlayers}
          networkError={networkError}
        />
      </div>
      <AnnouncementFeedDialog
        announcements={announcements}
        errorMessage={errorMessage}
        isLoading={isLoading}
        isMounted={mounted}
        isOpen={isOpen}
        selectedAnnouncementKey={selectedKey}
        onClose={() => setIsOpen(false)}
      />
    </section>
  );
}
