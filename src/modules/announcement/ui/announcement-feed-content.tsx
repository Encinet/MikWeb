'use client';

import { Bell } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';

import { formatAnnouncementDate } from '@/modules/announcement/lib/format-announcement-date';
import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { GlassSkeletonCard, SectionMessage, SkeletonLine } from '@/shared/ui/feedback/async-state';

const ANNOUNCEMENT_PREVIEW_SKELETON_IDS = ['preview-a', 'preview-b', 'preview-c'] as const;
const ANNOUNCEMENT_DIALOG_SKELETON_IDS = ['dialog-a', 'dialog-b', 'dialog-c', 'dialog-d'] as const;

const announcementCardSurfaceStyle: CSSProperties = {
  backdropFilter: 'blur(16px) saturate(150%)',
  WebkitBackdropFilter: 'blur(16px) saturate(150%)',
  background: 'var(--theme-surface-icon)',
  border: '1px solid var(--theme-border-glass)',
};

interface AnnouncementFeedContentProps {
  announcements: AnnouncementItem[];
  errorMessage: string | null;
  isLoading: boolean;
  variant: 'preview' | 'dialog';
}

export function AnnouncementFeedContent({
  announcements,
  errorMessage,
  isLoading,
  variant,
}: AnnouncementFeedContentProps) {
  const locale = useLocale();
  const t = useTranslations();
  const commonT = useTranslations('common');
  const isDialog = variant === 'dialog';

  if (isLoading) {
    return <AnnouncementSkeletonList isDialog={isDialog} />;
  }

  if (errorMessage) {
    return (
      <SectionMessage
        body={errorMessage}
        className="py-12"
        icon={Bell}
        iconClassName="mx-auto mb-4 h-12 w-12"
        iconColor="#FFAA00"
        title={commonT('states.error')}
      />
    );
  }

  if (announcements.length === 0) {
    return (
      <SectionMessage
        body={t('home.announcements.states.empty')}
        className="py-12"
        icon={Bell}
        iconClassName="mx-auto mb-4 h-12 w-12"
        iconColor="var(--theme-text-muted)"
      />
    );
  }

  const visibleAnnouncements = isDialog ? announcements : announcements.slice(0, 3);

  return (
    <div className={isDialog ? 'space-y-4' : 'space-y-3 sm:space-y-4'}>
      {visibleAnnouncements.map((announcement, announcementIndex) => (
        <AnnouncementEntryCard
          key={buildAnnouncementKey(announcement)}
          animationDelay={isDialog ? undefined : `${announcementIndex * 0.1}s`}
          announcement={announcement}
          formattedDate={formatAnnouncementDate(announcement.timestamp, locale)}
          variant={variant}
        />
      ))}
      {!isDialog && announcements.length > 3 ? (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--theme-text-muted)',
            fontSize: 'clamp(0.875rem, 2vw, 1rem)',
            marginTop: '1rem',
          }}
        >
          {t('home.announcements.actions.viewAll')}
        </div>
      ) : null}
    </div>
  );
}

interface AnnouncementEntryCardProps {
  announcement: AnnouncementItem;
  formattedDate: string;
  variant: 'preview' | 'dialog';
  animationDelay?: string;
}

function AnnouncementEntryCard({
  announcement,
  formattedDate,
  variant,
  animationDelay,
}: AnnouncementEntryCardProps) {
  const isDialog = variant === 'dialog';
  const shouldAnimateOnEnter = !isDialog && animationDelay !== undefined;

  return (
    <div
      className={[
        isDialog ? 'transition-transform hover:scale-[1.01]' : '',
        shouldAnimateOnEnter ? 'animate-card-enter' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...announcementCardSurfaceStyle,
        borderRadius: isDialog ? '16px' : '12px',
        padding: 'clamp(1rem, 3vw, 1.5rem)',
        transition: isDialog ? 'all 0.2s ease' : undefined,
        animationDelay: shouldAnimateOnEnter ? animationDelay : undefined,
      }}
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <div
          style={{
            width: isDialog ? '10px' : '8px',
            height: isDialog ? '10px' : '8px',
            marginTop: '8px',
            background: '#FFAA00',
            borderRadius: '50%',
            flexShrink: 0,
            boxShadow: isDialog ? '0 0 12px rgba(255, 170, 0, 0.6)' : undefined,
          }}
        />
        <div className="min-w-0 flex-1">
          <div
            style={{
              fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
              color: 'var(--theme-text-muted)',
              marginBottom: '8px',
              fontWeight: isDialog ? 500 : undefined,
            }}
          >
            {formattedDate}
          </div>
          <div
            style={{
              color: 'var(--theme-text-primary)',
              lineHeight: 1.75,
              whiteSpace: 'pre-line',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
            }}
          >
            {announcement.content}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnouncementSkeletonList({ isDialog }: { isDialog: boolean }) {
  const skeletonIds = isDialog
    ? ANNOUNCEMENT_DIALOG_SKELETON_IDS
    : ANNOUNCEMENT_PREVIEW_SKELETON_IDS;

  return (
    <div className="space-y-3 sm:space-y-4">
      {skeletonIds.map((skeletonId) => (
        <GlassSkeletonCard
          key={`announcement-skeleton-${skeletonId}`}
          style={{
            ...announcementCardSurfaceStyle,
            borderRadius: isDialog ? '16px' : '12px',
            padding: 'clamp(1rem, 3vw, 1.5rem)',
          }}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div
              style={{
                width: isDialog ? '10px' : '8px',
                height: isDialog ? '10px' : '8px',
                marginTop: '8px',
                borderRadius: '50%',
                flexShrink: 0,
                background: 'rgba(255, 170, 0, 0.4)',
              }}
            />
            <div className="min-w-0 flex-1">
              <SkeletonLine className="mb-3" tone="soft" width="32%" />
              <SkeletonLine className="mb-2.5" tone="soft" width="95%" />
              <SkeletonLine className="mb-2.5" tone="soft" width="88%" />
              <SkeletonLine tone="soft" width={isDialog ? '76%' : '64%'} />
            </div>
          </div>
        </GlassSkeletonCard>
      ))}
    </div>
  );
}

function buildAnnouncementKey(announcement: AnnouncementItem) {
  return `${announcement.timestamp}-${announcement.content.slice(0, 24)}`;
}
