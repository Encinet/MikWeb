'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { getWikiNavigationScrollMinimum } from '@/modules/wiki/lib/wiki-navigation-scroll';
import {
  decodeWikiHash,
  getWikiHistoryScroll,
  pushWikiHistory,
} from '@/modules/wiki/lib/wiki-outline';
import { searchWikiBlocks } from '@/modules/wiki/lib/wiki-search';
import type { WikiNavigationPanel } from '@/modules/wiki/model/use-wiki-navigation-panel';
import { useWikiPublicContent } from '@/modules/wiki/model/use-wiki-public-content';
import { useWikiReading } from '@/modules/wiki/model/use-wiki-reading';
import type {
  SearchableWikiBlock,
  WikiSectionDefinition,
  WikiSectionGroupDefinition,
  WikiSectionId,
  WikiSectionOutlineItem,
  WikiSectionOutlineMap,
} from '@/modules/wiki/model/wiki-section-types';
import { WikiMdx } from '@/modules/wiki/ui/wiki-mdx';
import { WikiNavigation } from '@/modules/wiki/ui/wiki-navigation';
import { WikiOutlineLinks } from '@/modules/wiki/ui/wiki-outline-links';
import { WikiReadingToolbar } from '@/modules/wiki/ui/wiki-reading-toolbar';
import { WikiSearchBox } from '@/modules/wiki/ui/wiki-search-box';
import { WikiSearchResults } from '@/modules/wiki/ui/wiki-search-results';
import { LoadingState } from '@/shared/ui/feedback/loading-state';
import { ContentBrowserHeader } from '@/shared/ui/page/content-browser-header';

const emptyOutline: WikiSectionOutlineItem[] = [];

interface WikiContentProps {
  pageTitle: string;
  navigation: string;
  onThisPage: string;
  searchPlaceholder: string;
  searchResultsLabel: string;
  searchResultsCountTemplate: string;
  searchEmptyTitle: string;
  searchEmptyDescription: string;
  clearSearchLabel: string;
  sections: WikiSectionDefinition[];
  sectionGroups: WikiSectionGroupDefinition[];
  compiled: Record<string, string>;
  outlines: WikiSectionOutlineMap;
  searchIndex: SearchableWikiBlock[];
  initialSection?: WikiSectionId;
  initialQuery?: string;
  staffStatus?: ReactNode;
}

export default function WikiContent({
  pageTitle,
  navigation,
  onThisPage,
  searchPlaceholder,
  searchResultsLabel,
  searchResultsCountTemplate,
  searchEmptyTitle,
  searchEmptyDescription,
  clearSearchLabel,
  sections,
  sectionGroups,
  compiled,
  outlines,
  searchIndex,
  initialSection,
  initialQuery = '',
  staffStatus,
}: WikiContentProps) {
  const locale = useLocale();
  const common = useTranslations('common');
  const fallbackSection = sections[0]?.id || '';
  const [activeSection, setActiveSection] = useState(initialSection || fallbackSection);
  const [navigationPanel, setNavigationPanel] = useState<WikiNavigationPanel>(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialQuery);
  const [isSearchComposing, setIsSearchComposing] = useState(false);
  const liveSearchQuery = searchQuery.trim();
  const deferredLiveSearchQuery = useDeferredValue(liveSearchQuery);
  const committedSearchQuery = useRef(initialQuery);
  const navigationRef = useRef<HTMLElement>(null);
  const activeSearchQuery = isSearchComposing
    ? debouncedSearchQuery
    : liveSearchQuery.length > 0
      ? deferredLiveSearchQuery
      : '';
  const isSearching = activeSearchQuery.length > 0;
  const sectionIds = useMemo(() => new Set(sections.map((section) => section.id)), [sections]);
  const prefetchSectionIds = useMemo(
    () =>
      sections
        .filter((section) => section.access === 'public' && !Object.hasOwn(compiled, section.id))
        .map((section) => section.id),
    [sections, compiled],
  );
  const publicSectionId =
    sections.find((section) => section.id === activeSection && section.access === 'public')?.id ??
    null;
  const resources = useWikiPublicContent({
    locale,
    sectionId: publicSectionId,
    hasInitialSection: Boolean(compiled[activeSection]),
    searchEnabled: liveSearchQuery.length > 0,
    prefetchSectionIds,
  });
  const activeCode = compiled[activeSection] ?? resources.section?.compiled;
  const activeOutline = outlines[activeSection] ?? resources.section?.outline ?? emptyOutline;
  const fullSearchIndex = useMemo(
    () => [...(resources.searchIndex ?? []), ...searchIndex],
    [resources.searchIndex, searchIndex],
  );
  useEffect(() => {
    if (isSearching) setNavigationPanel(null);
  }, [isSearching]);
  const { articleRef, activeSlug, requestScroll } = useWikiReading(
    activeSection,
    activeOutline,
    !isSearching && Boolean(activeCode),
  );
  const searchResults = useMemo(() => {
    if (!isSearching) return [];

    return searchWikiBlocks(fullSearchIndex, [activeSearchQuery], 12);
  }, [activeSearchQuery, isSearching, fullSearchIndex]);
  const searchResultsCountLabel = useMemo(() => {
    return searchResultsCountTemplate.replace('{count}', String(searchResults.length));
  }, [searchResults.length, searchResultsCountTemplate]);

  useEffect(() => {
    if (sectionIds.has(activeSection)) {
      return;
    }

    setActiveSection(fallbackSection);
  }, [activeSection, sectionIds, fallbackSection]);

  useEffect(() => {
    if (isSearchComposing || liveSearchQuery === debouncedSearchQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(liveSearchQuery);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [debouncedSearchQuery, isSearchComposing, liveSearchQuery]);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    let lastPopstateUrl: string | null = null;
    const syncLocationState = (event?: Event) => {
      if (event?.type === 'hashchange' && lastPopstateUrl === window.location.href) {
        lastPopstateUrl = null;
        return;
      }
      lastPopstateUrl = event?.type === 'popstate' ? window.location.href : null;
      const params = new URLSearchParams(window.location.search);
      const nextQuery = params.get('q')?.trim() ?? '';
      const selectedSectionId = params.get('section');
      const nextSection =
        selectedSectionId && sectionIds.has(selectedSectionId)
          ? selectedSectionId
          : fallbackSection;

      committedSearchQuery.current = nextQuery;
      setSearchQuery((currentQuery) => (currentQuery === nextQuery ? currentQuery : nextQuery));
      setDebouncedSearchQuery((currentQuery) =>
        currentQuery === nextQuery ? currentQuery : nextQuery,
      );
      setActiveSection((currentSection) =>
        currentSection === nextSection ? currentSection : nextSection,
      );
      setNavigationPanel(null);
      if (window.location.hash || event) {
        requestScroll({
          sectionId: nextSection,
          slug: decodeWikiHash(window.location.hash),
          focus: false,
          smooth: false,
          scrollY:
            event?.type === 'popstate' ? getWikiHistoryScroll(window.history.state) : undefined,
        });
      }
    };

    syncLocationState();
    window.addEventListener('popstate', syncLocationState);
    window.addEventListener('hashchange', syncLocationState);
    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
      window.removeEventListener('popstate', syncLocationState);
      window.removeEventListener('hashchange', syncLocationState);
    };
  }, [sectionIds, fallbackSection, requestScroll]);

  useEffect(() => {
    if (debouncedSearchQuery === committedSearchQuery.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (debouncedSearchQuery) {
      params.set('q', debouncedSearchQuery);
    } else {
      params.delete('q');
    }
    if (activeSection) {
      params.set('section', activeSection);
    } else {
      params.delete('section');
    }

    const nextQueryString = params.toString();
    const nextUrl = `${window.location.pathname}${nextQueryString ? `?${nextQueryString}` : ''}${window.location.hash}`;

    window.history.replaceState(window.history.state, '', nextUrl);
    committedSearchQuery.current = debouncedSearchQuery;
  }, [activeSection, debouncedSearchQuery]);

  const pushUrlState = ({
    nextSection = activeSection,
    nextQuery = debouncedSearchQuery,
    nextHash = '',
  }: {
    nextSection?: string;
    nextQuery?: string;
    nextHash?: string;
  }) => {
    const params = new URLSearchParams(window.location.search);
    if (nextSection) {
      params.set('section', nextSection);
    } else {
      params.delete('section');
    }
    if (nextQuery) {
      params.set('q', nextQuery);
    } else {
      params.delete('q');
    }

    const nextQueryString = params.toString();
    const nextUrl = `${window.location.pathname}${nextQueryString ? `?${nextQueryString}` : ''}${nextHash}`;
    pushWikiHistory(window.history, window.location.href, nextUrl, window.scrollY);
  };

  const handleSectionChange = (id: WikiSectionId) => {
    setNavigationPanel(null);
    if (id === activeSection && !liveSearchQuery && !isSearching) return;

    const minScrollY = getWikiNavigationScrollMinimum(navigationRef.current);
    committedSearchQuery.current = '';
    setActiveSection(id);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    pushUrlState({ nextSection: id, nextQuery: '', nextHash: '' });
    requestScroll({
      sectionId: id,
      slug: '',
      focus: true,
      smooth: false,
      onlyIfAbove: true,
      minScrollY,
    });
  };

  const handleSearchResultOpen = (result: (typeof searchResults)[number]) => {
    setNavigationPanel(null);
    committedSearchQuery.current = '';
    setActiveSection(result.sectionId);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    const nextHash = result.slug ? `#${encodeURIComponent(result.slug)}` : '';
    pushUrlState({ nextSection: result.sectionId, nextQuery: '', nextHash });
    requestScroll({ sectionId: result.sectionId, slug: result.slug, focus: true, smooth: true });
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  };

  const handleOutlineOpen = (item: WikiSectionOutlineItem) => {
    if (!item.slug) return;
    committedSearchQuery.current = '';
    setSearchQuery('');
    setDebouncedSearchQuery('');
    pushUrlState({ nextQuery: '', nextHash: `#${encodeURIComponent(item.slug)}` });
    requestScroll({ sectionId: activeSection, slug: item.slug, focus: true, smooth: true });
  };

  return (
    <div className="wiki-page page-shell">
      <div className="wiki-page__inner">
        <ContentBrowserHeader
          title={pageTitle}
          titleAside={<div className="wiki-access-status-slot">{staffStatus}</div>}
          search={
            <WikiSearchBox
              clearSearchLabel={clearSearchLabel}
              onChange={setSearchQuery}
              onClear={handleSearchClear}
              onCompositionEnd={(event) => {
                const nextQuery = event.currentTarget.value.trim();

                setIsSearchComposing(false);
                setSearchQuery(event.currentTarget.value);
                setDebouncedSearchQuery(nextQuery);
              }}
              onCompositionStart={() => setIsSearchComposing(true)}
              placeholder={searchPlaceholder}
              searchQuery={searchQuery}
            />
          }
        />
        <div
          className={`wiki-page__layout ${!isSearching && activeOutline.length > 0 ? 'has-outline' : ''}`}
        >
          <aside className="wiki-page__navigation" ref={navigationRef}>
            <WikiNavigation
              activeSection={activeSection}
              isSearching={isSearching}
              navigationLabel={navigation}
              onSectionChange={handleSectionChange}
              sectionGroups={sectionGroups}
            />
          </aside>

          <div className="wiki-page__content-column">
            <WikiReadingToolbar
              activeSection={activeSection}
              activeSlug={activeSlug}
              isSearching={isSearching}
              items={activeOutline}
              navigationLabel={navigation}
              outlineLabel={onThisPage}
              sectionGroups={sectionGroups}
              panel={navigationPanel}
              onPanelChange={setNavigationPanel}
              onSectionChange={handleSectionChange}
              onOutlineOpen={handleOutlineOpen}
            />
            <div className="wiki-page__content-panel">
              {isSearching && !resources.searchIndex ? (
                <WikiResourceStatus
                  failed={resources.searchFailed}
                  onRetry={resources.retrySearch}
                  loadingLabel={common('states.loading')}
                  errorLabel={common('states.error')}
                  retryLabel={common('actions.retry')}
                />
              ) : isSearching ? (
                <WikiSearchResults
                  emptyDescription={searchEmptyDescription}
                  emptyTitle={searchEmptyTitle}
                  onOpenResult={handleSearchResultOpen}
                  results={searchResults}
                  resultsCountLabel={searchResultsCountLabel}
                  resultsLabel={searchResultsLabel}
                />
              ) : (
                <article
                  key={activeSection}
                  data-section={activeSection}
                  ref={articleRef}
                  tabIndex={-1}
                  className="wiki-markdown"
                >
                  {activeCode ? (
                    <WikiMdx code={activeCode} />
                  ) : (
                    <WikiResourceStatus
                      failed={resources.sectionFailed}
                      onRetry={resources.retrySection}
                      loadingLabel={common('states.loading')}
                      errorLabel={common('states.error')}
                      retryLabel={common('actions.retry')}
                    />
                  )}
                </article>
              )}
            </div>
          </div>
          {!isSearching && activeOutline.length > 0 ? (
            <aside className="wiki-page__outline">
              <WikiOutlineLinks
                activeSlug={activeSlug}
                sectionId={activeSection}
                items={activeOutline}
                label={onThisPage}
                onOpen={handleOutlineOpen}
              />
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WikiResourceStatus({
  failed,
  onRetry,
  loadingLabel,
  errorLabel,
  retryLabel,
}: {
  failed: boolean;
  onRetry: () => void;
  loadingLabel: string;
  errorLabel: string;
  retryLabel: string;
}) {
  if (!failed) return <LoadingState message={loadingLabel} />;
  return (
    <div className="wiki-staff-status" role="status">
      <p>{errorLabel}</p>
      <button type="button" onClick={onRetry}>
        {retryLabel}
      </button>
    </div>
  );
}
