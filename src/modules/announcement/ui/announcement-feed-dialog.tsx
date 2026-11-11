'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { lazy, Suspense } from 'react';

import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { loadAnnouncementFeedContent } from '@/modules/announcement/ui/announcement-loaders';
import { AppDialog } from '@/shared/ui/dialog/app-dialog';
import { LoadingState } from '@/shared/ui/feedback/loading-state';

const AnnouncementFeedContent = lazy(() =>
  loadAnnouncementFeedContent().then((module) => ({
    default: module.AnnouncementFeedContent,
  })),
);

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
  const commonT = useTranslations('common');

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      title={announcementsT('section.title')}
      icon={<Bell className="h-5 w-5" />}
      className="announcement-dialog"
    >
      <Suspense fallback={<LoadingState message={commonT('states.loading')} />}>
        <AnnouncementFeedContent
          announcements={announcements}
          errorMessage={errorMessage}
          isLoading={isLoading}
          selectedAnnouncementKey={selectedAnnouncementKey}
        />
      </Suspense>
    </AppDialog>
  );
}
