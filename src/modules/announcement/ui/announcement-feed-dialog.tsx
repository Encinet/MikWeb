'use client';

import { Bell, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';

import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { AnnouncementFeedContent } from '@/modules/announcement/ui/announcement-feed-content';

const MotionDiv = dynamic(() => import('framer-motion').then((m) => ({ default: m.motion.div })), {
  ssr: false,
});
const AnimatePresence = dynamic(
  () => import('framer-motion').then((m) => ({ default: m.AnimatePresence })),
  { ssr: false },
);

interface AnnouncementFeedDialogProps {
  announcements: AnnouncementItem[];
  errorMessage: string | null;
  isLoading: boolean;
  isOpen: boolean;
  isMounted: boolean;
  onClose: () => void;
}

export function AnnouncementFeedDialog({
  announcements,
  errorMessage,
  isLoading,
  isOpen,
  isMounted,
  onClose,
}: AnnouncementFeedDialogProps) {
  const t = useTranslations();

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <MotionDiv
          className="ui-dialog-overlay safe-fixed-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={onClose}
        >
          <MotionDiv
            className="ui-dialog-surface"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              borderRadius: '24px',
              maxWidth: '800px',
              width: '100%',
              maxHeight:
                'calc(var(--viewport-height-dynamic) - var(--viewport-top-inset) - var(--viewport-bottom-inset) - 2rem)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                padding: 'clamp(1.5rem, 4vw, 2rem)',
                borderBottom: '1px solid var(--theme-border-glass)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="ui-card-icon-surface"
                  style={{
                    padding: '10px',
                    borderRadius: '14px',
                    boxShadow: '0 4px 12px rgba(255, 170, 0, 0.15)',
                  }}
                >
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#FFAA00' }} />
                </div>
                <h3
                  style={{
                    fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'var(--theme-text-heading)',
                  }}
                >
                  {t('home.announcements.section.title')}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="ui-floating-surface ui-floating-control"
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  color: 'var(--theme-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <div style={{ padding: 'clamp(1.5rem, 4vw, 2rem)', overflowY: 'auto', flex: 1 }}>
              <AnnouncementFeedContent
                announcements={announcements}
                errorMessage={errorMessage}
                isLoading={isLoading}
                variant="dialog"
              />
            </div>
          </MotionDiv>
        </MotionDiv>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
