'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Suspense,
  use,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { browser } from 'react-dom';

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
  WikiArticleMap,
  WikiSectionOutlineMap,
} from '@/modules/wiki/model/wiki-content-types';
import type { WikiSearchEntry } from '@/modules/wiki/model/wiki-search-types';
import type {
  WikiSectionDefinition,
  WikiSectionGroupDefinition,
  WikiSectionId,
  WikiSectionOutlineItem,
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
  searchEmptyTitle: string;
  searchEmptyDescription: string;
  clearSearchLabel: string;
  sections: WikiSectionDefinition[];
  sectionGroups: WikiSectionGroupDefinition[];
  articles: WikiArticleMap;
  outlines: WikiSectionOutlineMap;
  searchIndex: WikiSearchEntry[];
  staffStatus?: ReactNode;
}

export default function WikiContent({
  pageTitle,
  navigation,
  onThisPage,
  searchPlaceholder,
  searchResultsLabel,
  searchEmptyTitle,
  searchEmptyDescription,
  clearSearchLabel,
  sections,
  sectionGroups,
  articles,
  outlines,
  searchIndex,
  staffStatus,
}: WikiContentProps) {
  const locale = useLocale();
  const common = useTranslations('common');
  const searchT = useTranslations('wiki.search');
  const fallbackSection = sections.find((section) => section.access === 'public')?.id ?? '';
  const [activeSection, setActiveSection] = useState(fallbackSection);
  const [navigationPanel, setNavigationPanel] = useState<WikiNavigationPanel>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearchComposing, setIsSearchComposing] = useState(false);
  const liveSearchQuery = searchQuery.trim();
  const deferredLiveSearchQuery = useDeferredValue(liveSearchQuery);
  const pendingSearchEdit = useRef<string | null>(null);
  const syncedLocation = useRef<{ href: string; section: string } | null>(null);
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
        .filter((section) => section.access === 'public' && !Object.hasOwn(articles, section.id))
        .map((section) => section.id),
    [sections, articles],
  );
  const publicSectionId =
    sections.find((section) => section.id === activeSection && section.access === 'public')?.id ??
    null;
  const resources = useWikiPublicContent({
    locale,
    sectionId: publicSectionId,
    hasInitialSection: Object.hasOwn(articles, activeSection),
    searchEnabled: liveSearchQuery.length > 0,
    prefetchSectionIds,
  });
  const activeArticle = Object.hasOwn(articles, activeSection)
    ? articles[activeSection]
    : resources.section?.article;
  const activeOutline = outlines[activeSection] ?? resources.section?.outline ?? emptyOutline;
  const fullSearchIndex = useMemo(() => {
    const publicSearchIndex = resources.searchIndex;
    if (!publicSearchIndex?.length) return searchIndex;
    if (!searchIndex.length) return publicSearchIndex;
    return [...publicSearchIndex, ...searchIndex];
  }, [resources.searchIndex, searchIndex]);
  useEffect(() => {
    if (isSearching) setNavigationPanel(null);
  }, [isSearching]);
  const { articleRef, activeSlug, requestScroll } = useWikiReading(
    activeSection,
    activeOutline,
    !isSearching && Boolean(activeArticle),
  );
  const searchResults = useMemo(() => {
    if (!isSearching) return [];

    return searchWikiBlocks(fullSearchIndex, [activeSearchQuery], 12);
  }, [activeSearchQuery, isSearching, fullSearchIndex]);
  const searchResultsCountLabel = searchT('resultsCount', { count: searchResults.length });

  useEffect(() => {
    if (isSearchComposing || liveSearchQuery === debouncedSearchQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(liveSearchQuery);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [debouncedSearchQuery, isSearchComposing, liveSearchQuery]);

  const syncLocationState = useCallback(
    (event?: Event) => {
      const href = window.location.href;
      const params = new URLSearchParams(window.location.search);
      const selectedSectionId = params.get('section');
      const nextSection =
        selectedSectionId && sectionIds.has(selectedSectionId)
          ? selectedSectionId
          : fallbackSection;

      const previous = syncedLocation.current;
      if (!event && previous?.href === href && previous.section === nextSection) return;
      syncedLocation.current = { href, section: nextSection };
      // Staff verification can resolve a deep link while the user is editing the search field.
      if (event || previous?.href !== href) {
        const nextQuery = params.get('q')?.trim() ?? '';
        pendingSearchEdit.current = null;
        setSearchQuery(nextQuery);
        setDebouncedSearchQuery(nextQuery);
        setNavigationPanel(null);
      }
      setActiveSection(nextSection);
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
    },
    [fallbackSection, requestScroll, sectionIds],
  );

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    let lastPopstateUrl: string | null = null;
    const restore = (event: Event) => {
      if (event.type === 'hashchange' && lastPopstateUrl === window.location.href) {
        lastPopstateUrl = null;
        return;
      }
      lastPopstateUrl = event.type === 'popstate' ? window.location.href : null;
      syncLocationState(event);
    };
    syncLocationState();
    window.addEventListener('popstate', restore);
    window.addEventListener('hashchange', restore);
    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
      window.removeEventListener('popstate', restore);
      window.removeEventListener('hashchange', restore);
    };
  }, [syncLocationState]);

  const syncRouterLocation = useCallback(
    (query: string) => {
      // Ignore our own shallow updates and router state from a superseded navigation.
      if (
        syncedLocation.current?.href !== window.location.href &&
        new URLSearchParams(window.location.search).toString() === query
      ) {
        syncLocationState();
      }
    },
    [syncLocationState],
  );

  useEffect(() => {
    // State restored from a link or Back/Forward must never write back into that URL.
    if (isSearchComposing || pendingSearchEdit.current !== debouncedSearchQuery) return;
    pendingSearchEdit.current = null;

    const params = new URLSearchParams(window.location.search);
    if ((params.get('q')?.trim() ?? '') === debouncedSearchQuery) return;
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

    window.history.replaceState(
      { mikWikiScrollY: getWikiHistoryScroll(window.history.state) },
      '',
      nextUrl,
    );
    syncedLocation.current = { href: window.location.href, section: activeSection };
  }, [activeSection, debouncedSearchQuery, isSearchComposing]);

  const pushUrlState = ({
    nextSection = activeSection,
    nextQuery = debouncedSearchQuery,
    nextHash = '',
  }: {
    nextSection?: string;
    nextQuery?: string;
    nextHash?: string;
  }) => {
    pendingSearchEdit.current = null;
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
    syncedLocation.current = { href: window.location.href, section: nextSection };
  };

  const handleSectionChange = (id: WikiSectionId) => {
    setNavigationPanel(null);
    if (id === activeSection && !liveSearchQuery && !isSearching) return;

    const minScrollY = getWikiNavigationScrollMinimum(navigationRef.current);
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
    setActiveSection(result.sectionId);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    const nextHash = result.slug ? `#${encodeURIComponent(result.slug)}` : '';
    pushUrlState({ nextSection: result.sectionId, nextQuery: '', nextHash });
    requestScroll({ sectionId: result.sectionId, slug: result.slug, focus: true, smooth: true });
  };

  const handleSearchChange = (query: string) => {
    pendingSearchEdit.current = query.trim();
    setSearchQuery(query);
  };

  const handleSearchClear = () => {
    handleSearchChange('');
    setDebouncedSearchQuery('');
  };

  const handleOutlineOpen = (item: WikiSectionOutlineItem) => {
    if (!item.slug) return;
    setSearchQuery('');
    setDebouncedSearchQuery('');
    pushUrlState({ nextQuery: '', nextHash: `#${encodeURIComponent(item.slug)}` });
    requestScroll({ sectionId: activeSection, slug: item.slug, focus: true, smooth: true });
  };

  return (
    <div className="wiki-page page-shell">
      <Suspense fallback={null}>
        <WikiRouterLocationObserver onChange={syncRouterLocation} />
      </Suspense>
      <div className="wiki-page__inner">
        <ContentBrowserHeader
          title={pageTitle}
          titleAside={<div className="wiki-access-status-slot">{staffStatus}</div>}
          search={
            <WikiSearchBox
              clearSearchLabel={clearSearchLabel}
              onChange={handleSearchChange}
              onClear={handleSearchClear}
              onCompositionEnd={(event) => {
                const nextQuery = event.currentTarget.value.trim();

                setIsSearchComposing(false);
                handleSearchChange(event.currentTarget.value);
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
                  {activeArticle ? (
                    <WikiMdx article={activeArticle} />
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

/** Next.js links can change the query without dispatching popstate. */
function WikiRouterLocationObserver({ onChange }: { onChange: (query: string) => void }) {
  use(browser('Wiki query navigation is handled in the browser.'));
  const query = useSearchParams()?.toString() ?? '';
  useEffect(() => onChange(query), [onChange, query]);
  return null;
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
