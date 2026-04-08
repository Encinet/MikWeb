'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { AnnouncementFeedContent } from '@/modules/announcement/ui/announcement-feed-content';

interface AnnouncementFeedSectionProps {
  announcements: AnnouncementItem[];
  errorMessage: string | null;
  isLoading: boolean;
  onOpen: () => void;
}

export function AnnouncementFeedSection({
  announcements,
  errorMessage,
  isLoading,
  onOpen,
}: AnnouncementFeedSectionProps) {
  const t = useTranslations();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="ui-card-surface ui-card-interactive mb-[clamp(3rem,6vw,5rem)] w-full cursor-pointer text-left"
      style={{
        padding: 'clamp(1.5rem, 4vw, 2rem)',
      }}
    >
      <div className="mb-6 flex items-center gap-3">
        <div
          className="ui-card-icon-surface"
          style={{
            padding: '8px',
          }}
        >
          <Bell className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#FFAA00' }} />
        </div>
        <h3
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 1.875rem)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--theme-text-heading)',
          }}
        >
          {t('home.announcements.section.title')}
        </h3>
      </div>

      <AnnouncementFeedContent
        announcements={announcements}
        errorMessage={errorMessage}
        isLoading={isLoading}
        variant="preview"
      />
    </button>
  );
}
