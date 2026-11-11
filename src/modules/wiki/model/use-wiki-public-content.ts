'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { WikiResourceCache } from '@/modules/wiki/lib/wiki-resource-cache';
import { useWikiPrefetch } from '@/modules/wiki/model/use-wiki-prefetch';

const noSections: readonly string[] = [];

interface WikiPublicContentOptions {
  locale: string;
  sectionId: string | null;
  hasInitialSection: boolean;
  searchEnabled: boolean;
  prefetchSectionIds?: readonly string[];
}

/** Only public data enters this visit-scoped cache; locale is part of every key. */
export function useWikiPublicContent({
  locale,
  sectionId,
  hasInitialSection,
  searchEnabled,
  prefetchSectionIds,
}: WikiPublicContentOptions) {
  const [cache] = useState(() => new WikiResourceCache());
  const [failedSection, setFailedSection] = useState<string | null>(null);
  const [failedSearchLocale, setFailedSearchLocale] = useState<string | null>(null);
  const sectionKey = sectionId ? `${locale}/${sectionId}` : null;
  // Background chapters must not re-render the article currently being read.
  const readSection = useCallback(
    () => (sectionKey ? cache.getSnapshot().sections[sectionKey] : undefined),
    [cache, sectionKey],
  );
  const readSearchIndex = useCallback(
    () => cache.getSnapshot().searchIndexes[locale] ?? null,
    [cache, locale],
  );
  const cachedSection = useSyncExternalStore(cache.subscribe, readSection, readSection);
  const searchIndex = useSyncExternalStore(cache.subscribe, readSearchIndex, readSearchIndex);
  const searchFailed = failedSearchLocale === locale;

  useEffect(() => () => cache.cancelLocale(locale), [cache, locale]);

  useEffect(() => {
    if (
      !sectionId ||
      !sectionKey ||
      hasInitialSection ||
      cachedSection ||
      failedSection === sectionKey
    )
      return;
    let current = true;
    void cache.loadSection(locale, sectionId).catch(() => {
      if (current) setFailedSection(sectionKey);
    });
    return () => {
      current = false;
      cache.cancelSection(locale, sectionId);
    };
  }, [cache, cachedSection, hasInitialSection, locale, sectionId, sectionKey, failedSection]);

  useEffect(() => {
    if (!searchEnabled || searchIndex || searchFailed) return;
    let current = true;
    void cache.loadSearchIndex(locale).catch(() => {
      if (current) setFailedSearchLocale(locale);
    });
    return () => {
      current = false;
      cache.cancelSearchIndex(locale);
    };
  }, [cache, locale, searchEnabled, searchIndex, searchFailed]);

  useWikiPrefetch(
    cache,
    locale,
    prefetchSectionIds ?? noSections,
    prefetchSectionIds !== undefined &&
      (hasInitialSection || Boolean(cachedSection)) &&
      !searchEnabled,
  );

  return {
    section: cachedSection,
    searchIndex,
    sectionFailed: failedSection === sectionKey && sectionKey !== null,
    searchFailed,
    retrySection: () => {
      setFailedSection(null);
    },
    retrySearch: () => {
      setFailedSearchLocale(null);
    },
  };
}
