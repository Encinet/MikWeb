'use client';

import { Bell } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';

import { AppDialog } from '@/shared/ui/dialog/app-dialog';
import { LoadingState } from '@/shared/ui/feedback/loading-state';

const AnnouncementFeedContent = dynamic(
  () =>
    import('@/modules/announcement/ui/announcement-feed-content').then(
      (module) => module.AnnouncementFeedContent,
    ),
  { loading: () => <AnnouncementLoading /> },
);

function AnnouncementLoading() {
  const t = useTranslations('common');
  return <LoadingState message={t('states.loading')} />;
}

interface AnnouncementFeedDialogProps {
  announcements: AnnouncementItem[];
  errorMessage: string | null;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  selectedAnnouncementKey?: string | null;
}

export function AnnouncementFeedDialog({
  announcements,
  errorMessage,
  isLoading,
  isOpen,
  onClose,
  selectedAnnouncementKey,
}: AnnouncementFeedDialogProps) {
  const announcementsT = useTranslations('announcements');

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      title={announcementsT('section.title')}
      icon={<Bell className="h-5 w-5" />}
      className="announcement-dialog"
    >
      <AnnouncementFeedContent
        announcements={announcements}
        errorMessage={errorMessage}
        isLoading={isLoading}
        selectedAnnouncementKey={selectedAnnouncementKey}
      />
    </AppDialog>
  );
}
