'use client';

import { Building2, Clock, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useAnnouncementsFeed } from '@/modules/announcement/model/use-announcements-feed';
import { AnnouncementFeedDialog } from '@/modules/announcement/ui/announcement-feed-dialog';
import { AnnouncementFeedSection } from '@/modules/announcement/ui/announcement-feed-section';
import { useBuildings } from '@/modules/building/model/use-buildings';
import type { HomeOverviewStat } from '@/modules/home/ui/overview-stats-grid';
import { OverviewStatsGrid } from '@/modules/home/ui/overview-stats-grid';
import { usePlayerStatus } from '@/modules/player/model/use-player-status';
import PlayerHistoryPanel from '@/modules/player-history/ui/player-history-panel';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';

const SERVER_START_DATE = new Date('2025-07-15');

export default function HomeLiveOverview() {
  const commonT = useTranslations('common');
  const t = useTranslations();
  const {
    playerCount,
    isLoading: isLoadingPlayers,
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
  const stats: HomeOverviewStat[] = [
    {
      id: 'active-players',
      icon: Users,
      label: t('home.stats.activePlayers'),
      value: isLoadingPlayers || hasPlayerNetworkError ? '-' : `${playerCount}`,
      iconColor: 'var(--theme-accent-green-strong)',
    },
    {
      id: 'total-buildings',
      icon: Building2,
      label: t('home.stats.totalBuildings'),
      value: lastUpdatedAt === null ? '-' : `${buildingCount}`,
      iconColor: '#FFAA00',
    },
    {
      id: 'uptime-days',
      icon: Clock,
      label: t('home.stats.uptime'),
      value: mounted && uptime > 0 ? `${uptime}` : '-',
      suffix: t('home.stats.days'),
      iconColor: '#55AAFF',
    },
  ];

  return (
    <>
      <OverviewStatsGrid stats={stats} />

      <PlayerHistoryPanel />

      <AnnouncementFeedSection
        announcements={announcements}
        errorMessage={announcementsErrorMessage}
        isLoading={isLoadingAnnouncements}
        onOpen={() => setIsAnnouncementsModalOpen(true)}
      />

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
