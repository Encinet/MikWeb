'use client';

import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import {
  decodeWikiHash,
  getWikiHistoryScroll,
  pushWikiHistory,
} from '@/modules/wiki/lib/wiki-outline';
import { searchWikiBlocks } from '@/modules/wiki/lib/wiki-search';
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
import { createWikiMarkdownRenderers } from '@/modules/wiki/ui/wiki-markdown-renderers';
import { WikiMobileOutline } from '@/modules/wiki/ui/wiki-mobile-outline';
import { WikiNavigation } from '@/modules/wiki/ui/wiki-navigation';
import { WikiOutlineLinks } from '@/modules/wiki/ui/wiki-outline-links';
import { WikiSearchBox } from '@/modules/wiki/ui/wiki-search-box';
import { WikiSearchResults } from '@/modules/wiki/ui/wiki-search-results';
import { ContentBrowserHeader } from '@/shared/ui/page/content-browser-header';

const wikiSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    td: [...(defaultSchema.attributes?.td ?? []), 'rowSpan', 'colSpan'],
    th: [...(defaultSchema.attributes?.th ?? []), 'rowSpan', 'colSpan', 'scope'],
  },
};

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
  outlines: WikiSectionOutlineMap;
  searchIndex: SearchableWikiBlock[];
  initialSection?: WikiSectionId;
  initialQuery?: string;
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
  outlines,
  searchIndex,
  initialSection,
  initialQuery = '',
}: WikiContentProps) {
  const fallbackSection = sections[0]?.id || '';
  const [activeSection, setActiveSection] = useState(initialSection || fallbackSection);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialQuery);
  const [isSearchComposing, setIsSearchComposing] = useState(false);
  const liveSearchQuery = searchQuery.trim();
  const deferredLiveSearchQuery = useDeferredValue(liveSearchQuery);
  const committedSearchQuery = useRef(initialQuery);
  const activeOutline = outlines[activeSection] ?? emptyOutline;
  const activeSearchQuery = isSearchComposing
    ? debouncedSearchQuery
    : liveSearchQuery.length > 0
      ? deferredLiveSearchQuery
      : '';
  const isSearching = activeSearchQuery.length > 0;
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
    if (content[activeSection]) {
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
        selectedSectionId && content[selectedSectionId] ? selectedSectionId : fallbackSection;

      committedSearchQuery.current = nextQuery;
      setSearchQuery((currentQuery) => (currentQuery === nextQuery ? currentQuery : nextQuery));
      setDebouncedSearchQuery((currentQuery) =>
        currentQuery === nextQuery ? currentQuery : nextQuery,
      );
      setActiveSection((currentSection) =>
        currentSection === nextSection ? currentSection : nextSection,
      );
      setIsSidebarOpen(false);
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
    setIsSidebarOpen(false);
    committedSearchQuery.current = '';
    setActiveSection(id);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    pushUrlState({ nextSection: id, nextQuery: '', nextHash: '' });
    requestScroll({ sectionId: id, slug: '', focus: true, smooth: false });
  };

  const handleSearchResultOpen = (result: (typeof searchResults)[number]) => {
    setIsSidebarOpen(false);
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

  const markdownComponents = useMemo(() => createWikiMarkdownRenderers(), []);

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

          <div className={`wiki-page__layout ${isSearching ? 'is-searching' : ''}`}>
            <WikiNavigation
              activeSection={activeSection}
              isSearching={isSearching}
              isSidebarOpen={isSidebarOpen}
              navigationLabel={navigation}
              onSectionChange={handleSectionChange}
              onSidebarOpenChange={setIsSidebarOpen}
              sectionGroups={sectionGroups}
            />

            <div className="wiki-page__content-column">
              {!isSearching && activeOutline.length > 0 ? (
                <WikiMobileOutline
                  key={activeSection}
                  activeSlug={activeSlug}
                  sectionId={activeSection}
                  items={activeOutline}
                  label={onThisPage}
                  onOpen={handleOutlineOpen}
                />
              ) : null}
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
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[
                          rehypeRaw,
                          [rehypeSanitize, wikiSanitizeSchema],
                          rehypeSlug,
                        ]}
                        components={markdownComponents as object}
                      >
                        {content[activeSection]}
                      </ReactMarkdown>
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
