'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { AnnouncementDialogFeed } from '@/modules/announcement/ui/announcement-dialog-feed';
import { SectionMessage, SkeletonLine } from '@/shared/ui/feedback/async-state';

const ANNOUNCEMENT_DIALOG_SKELETON_IDS = ['dialog-a', 'dialog-b', 'dialog-c', 'dialog-d'] as const;

interface AnnouncementFeedContentProps {
  announcements: AnnouncementItem[];
  errorMessage: string | null;
  isLoading: boolean;
  selectedAnnouncementKey?: string | null;
}

export function AnnouncementFeedContent({
  announcements,
  errorMessage,
  isLoading,
  selectedAnnouncementKey,
}: AnnouncementFeedContentProps) {
  const announcementsT = useTranslations('announcements');
  const commonT = useTranslations('common');

  if (isLoading) {
    return <AnnouncementSkeletonList />;
  }

  if (errorMessage) {
    return (
      <SectionMessage
        body={errorMessage}
        className="py-12"
        icon={Bell}
        iconClassName="mx-auto mb-4 h-12 w-12"
        iconColor="var(--theme-accent-strong)"
        title={commonT('states.error')}
      />
    );
  }

  if (announcements.length === 0) {
    return (
      <SectionMessage
        body={announcementsT('states.empty')}
        className="py-12"
        icon={Bell}
        iconClassName="mx-auto mb-4 h-12 w-12"
        iconColor="var(--theme-text-muted)"
      />
    );
  }

  return (
    <AnnouncementDialogFeed
      announcements={announcements}
      selectedAnnouncementKey={selectedAnnouncementKey}
    />
  );
}

function AnnouncementSkeletonList() {
  return (
    <div className="announcement-dialog-skeleton" aria-hidden="true">
      {ANNOUNCEMENT_DIALOG_SKELETON_IDS.map((id) => (
        <div key={id} className="announcement-dialog-skeleton__entry">
          <SkeletonLine className="mb-4" tone="soft" width="30%" />
          <SkeletonLine className="mb-3" tone="soft" width="95%" />
          <SkeletonLine className="mb-3" tone="soft" width="88%" />
          <SkeletonLine tone="soft" width="65%" />
        </div>
      ))}
    </div>
  );
}
