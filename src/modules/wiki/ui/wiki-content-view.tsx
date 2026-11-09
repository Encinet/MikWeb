'use client';

import { AnimatePresence, MotionConfig, motion } from 'motion/react';
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
import { useWikiReading } from '@/modules/wiki/model/use-wiki-reading';
import type {
  SearchableWikiBlock,
  WikiSectionContentMap,
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
  content: WikiSectionContentMap;
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
  content,
  compiled,
  outlines,
  searchIndex,
  initialSection,
  initialQuery = '',
  staffStatus,
}: WikiContentProps) {
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
  const activeOutline = outlines[activeSection] ?? emptyOutline;
  const activeSearchQuery = isSearchComposing
    ? debouncedSearchQuery
    : liveSearchQuery.length > 0
      ? deferredLiveSearchQuery
      : '';
  const isSearching = activeSearchQuery.length > 0;
  useEffect(() => {
    if (isSearching) setNavigationPanel(null);
  }, [isSearching]);
  const { articleRef, activeSlug, requestScroll } = useWikiReading(
    activeSection,
    activeOutline,
    !isSearching,
  );
  const searchResults = useMemo(() => {
    if (!isSearching) return [];

    return searchWikiBlocks(searchIndex, [activeSearchQuery], 12);
  }, [activeSearchQuery, isSearching, searchIndex]);
  const searchResultsCountLabel = useMemo(() => {
    return searchResultsCountTemplate.replace('{count}', String(searchResults.length));
  }, [searchResults.length, searchResultsCountTemplate]);

  useEffect(() => {
    if (Object.hasOwn(content, activeSection)) {
      return;
    }

    setActiveSection(fallbackSection);
  }, [activeSection, content, fallbackSection]);

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
        selectedSectionId && Object.hasOwn(content, selectedSectionId)
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
  }, [content, fallbackSection, requestScroll]);

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
    <MotionConfig reducedMotion="user">
      <div className="wiki-page page-shell">
        <div className="wiki-page__inner">
          <ContentBrowserHeader
            title={pageTitle}
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
          {staffStatus}

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
                <AnimatePresence mode="wait" initial={false}>
                  {isSearching ? (
                    <WikiSearchResults
                      emptyDescription={searchEmptyDescription}
                      emptyTitle={searchEmptyTitle}
                      isSearching={isSearching}
                      onOpenResult={handleSearchResultOpen}
                      results={searchResults}
                      resultsCountLabel={searchResultsCountLabel}
                      resultsLabel={searchResultsLabel}
                    />
                  ) : (
                    <motion.article
                      key={activeSection}
                      data-section={activeSection}
                      ref={articleRef}
                      tabIndex={-1}
                      initial={false}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.1 } }}
                      transition={{ duration: 0.16 }}
                      className="wiki-markdown"
                    >
                      {compiled[activeSection] ? <WikiMdx code={compiled[activeSection]} /> : null}
                    </motion.article>
                  )}
                </AnimatePresence>
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
    </MotionConfig>
  );
}
