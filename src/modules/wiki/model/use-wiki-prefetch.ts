'use client';

import { useEffect } from 'react';
import type { WikiResourceCache } from '@/modules/wiki/lib/wiki-resource-cache';
import { scheduleBackgroundWork } from '@/shared/lib/background-work';

/** One low-priority request at a time, after load, only while reading visibly. */
export function useWikiPrefetch(
  cache: WikiResourceCache,
  locale: string,
  sectionIds: readonly string[],
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) {
      cache.cancelBackground();
      return;
    }
    const attempted = new Set<string>();
    return scheduleBackgroundWork(
      async () => {
        const pending = cache.pendingBackground();
        const id = sectionIds.find(
          (id) =>
            !cache.getSnapshot().sections[`${locale}/${id}`] && !attempted.has(`section:${id}`),
        );
        if (
          !pending &&
          !id &&
          (cache.getSnapshot().searchIndexes[locale] || attempted.has('search'))
        )
          return false;
        const key = id ? `section:${id}` : 'search';
        if (!pending) attempted.add(key);
        const request =
          pending ??
          (id ? cache.loadSection(locale, id, true) : cache.loadSearchIndex(locale, true));
        // Speculative failures stay silent. A click/search still makes a normal retry.
        await request.catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') attempted.delete(key);
        });
        return true;
      },
      () => cache.cancelBackground(),
    );
  }, [cache, enabled, locale, sectionIds]);
}
