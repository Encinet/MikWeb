'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { sortAnnouncements } from '@/modules/announcement/lib/announcement-feed';
import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { isAnnouncementItemArray } from '@/modules/announcement/model/announcement-types';
import { dataApiUrl } from '@/shared/api/data-api-url';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';

interface UseAnnouncementsFeedOptions {
  fallbackErrorMessage: string;
}

const ANNOUNCEMENTS_REFRESH_INTERVAL_MS = 30_000;
const RESUME_DEDUP_INTERVAL_MS = 5_000;

export function useAnnouncementsFeed({ fallbackErrorMessage }: UseAnnouncementsFeedOptions) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoaded = useRef(false);
  const refreshRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => refreshRef.current?.(), []);

  useEffect(() => {
    let isActive = true;
    let fetching = false;
    let lastRequestedAt: number | null = null;
    let timer: number | null = null;

    const canRefresh = () => document.visibilityState !== 'hidden' && navigator.onLine !== false;
    const clearTimer = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };
    const schedule = () => {
      if (isActive && canRefresh() && timer === null) {
        timer = window.setTimeout(
          () => void loadAnnouncements(),
          ANNOUNCEMENTS_REFRESH_INTERVAL_MS,
        );
      }
    };

    const loadAnnouncements = async () => {
      if (!isActive || !canRefresh() || fetching) return;
      clearTimer();
      fetching = true;
      lastRequestedAt = Date.now();
      const announcementsResult = await fetchValidatedJson({
        url: dataApiUrl('/announcements'),
        validate: isAnnouncementItemArray,
        timeoutMs: 15_000,
        // An HTTP stale-while-revalidate response must not become another browser snapshot.
        cache: 'no-store',
        fallbackErrorMessage,
      });

      if (!isActive) {
        return;
      }

      if (announcementsResult.status === 'success') {
        hasLoaded.current = true;
        setAnnouncements(sortAnnouncements(announcementsResult.data));
        setErrorMessage(null);
      } else {
        if (announcementsResult.status === 'network-error') {
          console.error('Failed to fetch announcements:', announcementsResult.cause);
        }

        // Keep the last successful feed readable during a temporary refresh failure.
        if (!hasLoaded.current) setErrorMessage(announcementsResult.error);
      }

      setIsLoading(false);
      fetching = false;
      schedule();
    };

    const resume = () => {
      if (!canRefresh()) {
        clearTimer();
        return;
      }
      // Returning to a tab can emit visibilitychange, pageshow and focus together.
      if (lastRequestedAt === null || Date.now() - lastRequestedAt >= RESUME_DEDUP_INTERVAL_MS) {
        void loadAnnouncements();
      } else if (!fetching) schedule();
    };

    refreshRef.current = () => void loadAnnouncements();
    void loadAnnouncements();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('online', resume);
    window.addEventListener('offline', resume);

    return () => {
      isActive = false;
      refreshRef.current = null;
      clearTimer();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('online', resume);
      window.removeEventListener('offline', resume);
    };
  }, [fallbackErrorMessage]);

  return {
    announcements,
    errorMessage,
    isLoading,
    refresh,
  };
}
