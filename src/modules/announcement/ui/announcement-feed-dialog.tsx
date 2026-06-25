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
            className="ui-dialog-surface app-dialog-window app-dialog-window--compact"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              maxWidth: 'none',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-dialog-chrome">
              <div aria-hidden="true" />

              <div className="app-dialog-title">
                <Bell className="h-4 w-4 shrink-0" style={{ color: '#79B86F' }} />
                <span>{t('home.announcements.section.title')}</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="app-dialog-close ui-floating-control"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="app-dialog-body">
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
