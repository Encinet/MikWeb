'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { lazy, Suspense, useLayoutEffect, useState } from 'react';
import { getAnnouncementKey } from '@/modules/announcement/lib/announcement-feed';
import {
  formatAnnouncementDate,
  getAnnouncementDateTimeValue,
} from '@/modules/announcement/lib/format-announcement-date';
import { useAnnouncementsFeed } from '@/modules/announcement/model/use-announcements-feed';
import { AnnouncementFeedDialog } from '@/modules/announcement/ui/announcement-feed-dialog';
import {
  loadAnnouncementBody,
  loadAnnouncementFeedContent,
} from '@/modules/announcement/ui/announcement-loaders';
import HomePlayerList from '@/modules/home/ui/home-player-list';
import { HomeServerStatus } from '@/modules/home/ui/home-server-status';
import { usePlayerStatus } from '@/modules/player/model/use-player-status';
import { SITE_TRANSLATION_VALUES } from '@/shared/config/site-config';
import { useBackgroundPrefetch } from '@/shared/hooks/use-background-prefetch';
import { SkeletonLine } from '@/shared/ui/feedback/async-state';

const AnnouncementPreview = lazy(() =>
  loadAnnouncementBody().then((module) => ({ default: module.AnnouncementPreview })),
);

export default function HomeLiveOverview({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const homeT = useTranslations('home');
  const announcementsT = useTranslations('announcements');
  const commonT = useTranslations('common');
  const {
    players,
    playerCount,
    isLoading: isLoadingPlayers,
    isOnline,
    hasNetworkError,
  } = usePlayerStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  useBackgroundPrefetch(loadAnnouncementFeedContent);
  useLayoutEffect(() => () => setIsOpen(false), []);
  const { announcements, errorMessage, isLoading, refresh } = useAnnouncementsFeed({
    fallbackErrorMessage: commonT('states.error'),
  });
  const openAnnouncements = (key: string | null = null) => {
    refresh();
    setSelectedKey(key);
    setIsOpen(true);
  };

  return (
    <section
      id="server-updates"
      className="home-daily"
      aria-label={homeT('live.statusTitle', SITE_TRANSLATION_VALUES)}
    >
      <HomeServerStatus />
      {children}
      <div className="home-daily-columns">
        <section className="home-live-announcements" aria-labelledby="home-announcements-title">
          <div className="home-live-announcements__head">
            <h2 id="home-announcements-title">{announcementsT('section.title')}</h2>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => openAnnouncements()}
              onPointerEnter={() => void loadAnnouncementFeedContent().catch(() => undefined)}
              onFocus={() => void loadAnnouncementFeedContent().catch(() => undefined)}
            >
              {announcementsT('actions.viewAll')}
            </button>
          </div>
          <div className="home-live-announcements__list">
            {isLoading ? (
              <div className="home-announcements-loading" role="status">
                <span className="sr-only">{commonT('states.loading')}</span>
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
                  onPointerEnter={() => void loadAnnouncementFeedContent().catch(() => undefined)}
                  onFocus={() => void loadAnnouncementFeedContent().catch(() => undefined)}
                >
                  <time dateTime={getAnnouncementDateTimeValue(announcement.timestamp)}>
                    {formatAnnouncementDate(announcement.timestamp, locale)}
                  </time>
                  <Suspense
                    fallback={
                      <span className="announcement-preview" role="status">
                        {commonT('states.loading')}
                      </span>
                    }
                  >
                    <AnnouncementPreview content={announcement.content} />
                  </Suspense>
                </button>
              ))
            ) : (
              <p className="home-inline-state">{announcementsT('states.empty')}</p>
            )}
          </div>
        </section>
        <HomePlayerList
          players={players}
          playerCount={playerCount}
          isOnline={isOnline}
          isLoading={isLoadingPlayers}
          hasNetworkError={hasNetworkError}
        />
      </div>
      {isOpen && (
        <AnnouncementFeedDialog
          announcements={announcements}
          errorMessage={errorMessage}
          isLoading={isLoading}
          isOpen={isOpen}
          selectedAnnouncementKey={selectedKey}
          onClose={() => setIsOpen(false)}
        />
      )}
    </section>
  );
}
