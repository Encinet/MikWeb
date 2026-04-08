'use client';

import { useEffect, useState } from 'react';

import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { isAnnouncementItemArray } from '@/modules/announcement/model/announcement-types';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';

interface UseAnnouncementsFeedOptions {
  fallbackErrorMessage: string;
}

export function useAnnouncementsFeed({ fallbackErrorMessage }: UseAnnouncementsFeedOptions) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadAnnouncements = async () => {
      const announcementsResult = await fetchValidatedJson({
        url: '/api/announcements',
        validate: isAnnouncementItemArray,
        timeoutMs: 15_000,
        fallbackErrorMessage,
      });

      if (!isActive) {
        return;
      }

      if (announcementsResult.status === 'success') {
        setAnnouncements(announcementsResult.data);
        setErrorMessage(null);
      } else {
        if (announcementsResult.status === 'network-error') {
          console.error('Failed to fetch announcements:', announcementsResult.cause);
        }

        setAnnouncements([]);
        setErrorMessage(announcementsResult.error);
      }

      setIsLoading(false);
    };

    loadAnnouncements();

    return () => {
      isActive = false;
    };
  }, [fallbackErrorMessage]);

  return {
    announcements,
    errorMessage,
    isLoading,
  };
}
