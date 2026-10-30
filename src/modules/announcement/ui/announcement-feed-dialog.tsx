'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { AnnouncementFeedContent } from '@/modules/announcement/ui/announcement-feed-content';

import { AppDialog } from '@/shared/ui/dialog/app-dialog';

interface AnnouncementFeedDialogProps {
  announcements: AnnouncementItem[];
  errorMessage: string | null;
  isLoading: boolean;
  isOpen: boolean;
  isMounted: boolean;
  onClose: () => void;
  selectedAnnouncementKey?: string | null;
}

export function AnnouncementFeedDialog({
  announcements,
  errorMessage,
  isLoading,
  isOpen,
  isMounted,
  onClose,
  selectedAnnouncementKey,
}: AnnouncementFeedDialogProps) {
  const t = useTranslations();

  if (!isMounted) {
    return null;
  }

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('home.announcements.section.title')}
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
