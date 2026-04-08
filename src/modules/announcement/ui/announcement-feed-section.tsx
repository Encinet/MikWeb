'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { AnnouncementFeedContent } from '@/modules/announcement/ui/announcement-feed-content';
import { glassCardSurfaceStyle } from '@/shared/ui/surfaces/glass-card-surface-style';

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
      className="mb-[clamp(3rem,6vw,5rem)] w-full text-left"
      style={{
        ...glassCardSurfaceStyle,
        padding: 'clamp(1.5rem, 4vw, 2rem)',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = 'translateY(-3px)';
        event.currentTarget.style.boxShadow =
          '0 8px 32px var(--theme-shadow-glass), inset 0 1px 0 var(--theme-shadow-glass-inset)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = 'translateY(0)';
        event.currentTarget.style.boxShadow =
          '0 4px 24px var(--theme-shadow-glass), inset 0 1px 0 var(--theme-shadow-glass-inset)';
      }}
    >
      <div className="mb-6 flex items-center gap-3">
        <div
          style={{
            padding: '8px',
            borderRadius: '12px',
            backdropFilter: 'blur(16px) saturate(150%)',
            WebkitBackdropFilter: 'blur(16px) saturate(150%)',
            background: 'var(--theme-surface-icon)',
            border: '1px solid var(--theme-border-glass)',
            boxShadow:
              '0 4px 24px var(--theme-shadow-glass), inset 0 1px 0 var(--theme-shadow-glass-inset)',
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
