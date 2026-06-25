'use client';

import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { spring, wikiPanelSurfaceClassName } from '@/modules/wiki/lib/wiki-browser-config';
import { createWikiMarkdownRenderers } from '@/modules/wiki/lib/wiki-markdown-renderers';
import { searchWikiBlocks } from '@/modules/wiki/lib/wiki-search';
import type {
  SearchableWikiBlock,
  WikiSectionContentMap,
  WikiSectionDefinition,
  WikiSectionGroupDefinition,
  WikiSectionId,
  WikiSectionOutlineItem,
  WikiSectionOutlineMap,
} from '@/modules/wiki/model/wiki-section-types';
import { WikiNavigation } from '@/modules/wiki/ui/wiki-navigation';
import { WikiOutlineLinks } from '@/modules/wiki/ui/wiki-outline-links';
import { WikiSearchBox } from '@/modules/wiki/ui/wiki-search-box';
import { WikiSearchResults } from '@/modules/wiki/ui/wiki-search-results';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';

const wikiSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    td: [...(defaultSchema.attributes?.td ?? []), 'rowSpan', 'colSpan'],
    th: [...(defaultSchema.attributes?.th ?? []), 'rowSpan', 'colSpan', 'scope'],
  },
};

interface PendingWikiAnchor {
  heading: string;
  slug: string;
}

interface WikiContentProps {
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
  const fallbackSection = initialSection || sections[0]?.id || '';
  const [activeSection, setActiveSection] = useState(fallbackSection);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialQuery);
  const [isSearchComposing, setIsSearchComposing] = useState(false);
  const liveSearchQuery = searchQuery.trim();
  const deferredLiveSearchQuery = useDeferredValue(liveSearchQuery);
  const [pendingAnchor, setPendingAnchor] = useState<PendingWikiAnchor | null>(null);
  const committedSearchQuery = useRef(initialQuery);
  const [currentHash, setCurrentHash] = useState('');
  const hasMounted = useHasMounted();
  const activeOutline = outlines[activeSection] ?? [];
  const sectionIndexMap = useMemo(() => {
    return new Map(sections.map((section, index) => [section.id, index]));
  }, [sections]);
  const [sectionDirection, setSectionDirection] = useState(0);
  const activeSearchQuery = isSearchComposing
    ? debouncedSearchQuery
    : liveSearchQuery.length > 0
      ? deferredLiveSearchQuery
      : '';
  const isSearching = activeSearchQuery.length > 0;
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
    const syncLocationState = () => {
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
      setCurrentHash(window.location.hash);
    };

    syncLocationState();
    window.addEventListener('popstate', syncLocationState);
    window.addEventListener('hashchange', syncLocationState);
    return () => {
      window.removeEventListener('popstate', syncLocationState);
      window.removeEventListener('hashchange', syncLocationState);
    };
  }, [content, fallbackSection]);

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

  const replaceUrlState = ({
    nextSection = activeSection,
    nextQuery = debouncedSearchQuery,
    nextHash = currentHash,
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
    window.history.replaceState(window.history.state, '', nextUrl);
  };

  // Scroll to hash target after markdown renders
  useEffect(() => {
    const hash = pendingAnchor?.slug || currentHash.slice(1);
    const headingText = pendingAnchor?.heading ?? '';
    if (!hash && !headingText) return;
    const decodedHash = decodeURIComponent(hash);

    let attempts = 0;
    const maxAttempts = 24;

    const tryScroll = (): boolean => {
      const contentContainer = document.querySelector(`[data-section="${activeSection}"]`);
      if (!contentContainer) return false;

      if (decodedHash) {
        const hashTarget = document.getElementById(decodedHash);
        if (hashTarget && contentContainer?.contains(hashTarget)) {
          const top = hashTarget.getBoundingClientRect().top + window.scrollY - 160;
          window.scrollTo({ top, behavior: 'smooth' });
          if (pendingAnchor) setPendingAnchor(null);
          return true;
        }
      }

      const headings = contentContainer?.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (!headings) return false;
      for (const el of headings) {
        if (el.textContent?.trim() === headingText || el.textContent?.trim() === decodedHash) {
          const top = el.getBoundingClientRect().top + window.scrollY - 160;
          window.scrollTo({ top, behavior: 'smooth' });
          if (pendingAnchor) setPendingAnchor(null);
          return true;
        }
      }
      return false;
    };

    if (tryScroll()) {
      return;
    }

    const timer = window.setInterval(() => {
      attempts += 1;
      if (tryScroll() || attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 120);

    return () => window.clearInterval(timer);
  }, [activeSection, currentHash, pendingAnchor]);

  const handleSectionChange = (id: WikiSectionId) => {
    if (id === activeSection && !isSearching) return;
    const currentSectionIndex = sectionIndexMap.get(activeSection) ?? 0;
    const nextSectionIndex = sectionIndexMap.get(id) ?? currentSectionIndex;

    setSectionDirection(
      nextSectionIndex === currentSectionIndex
        ? 0
        : nextSectionIndex > currentSectionIndex
          ? 1
          : -1,
    );
    setIsSidebarOpen(false);
    committedSearchQuery.current = '';
    setActiveSection(id);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setPendingAnchor(null);
    setCurrentHash('');
    replaceUrlState({ nextSection: id, nextQuery: '', nextHash: '' });
  };

  const handleSearchResultOpen = (result: (typeof searchResults)[number]) => {
    const currentSectionIndex = sectionIndexMap.get(activeSection) ?? 0;
    const nextSectionIndex = sectionIndexMap.get(result.sectionId) ?? currentSectionIndex;

    setSectionDirection(
      nextSectionIndex === currentSectionIndex
        ? 0
        : nextSectionIndex > currentSectionIndex
          ? 1
          : -1,
    );
    setIsSidebarOpen(false);
    committedSearchQuery.current = '';
    setActiveSection(result.sectionId);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setPendingAnchor({
      heading: result.heading,
      slug: result.slug,
    });
    const nextHash = result.slug ? `#${encodeURIComponent(result.slug)}` : '';

    setCurrentHash(nextHash);
    replaceUrlState({ nextSection: result.sectionId, nextQuery: '', nextHash });
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  };

  const handleOutlineOpen = (item: WikiSectionOutlineItem) => {
    const nextHash = item.slug ? `#${encodeURIComponent(item.slug)}` : '';
    if (!nextHash) return;

    setPendingAnchor({
      heading: item.heading,
      slug: item.slug,
    });
    setCurrentHash(nextHash);
    committedSearchQuery.current = '';
    setSearchQuery('');
    setDebouncedSearchQuery('');
    replaceUrlState({ nextSection: activeSection, nextQuery: '', nextHash });
  };

  const markdownComponents = useMemo(() => createWikiMarkdownRenderers(), []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="page-shell">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="mb-6 sm:mb-8"
            initial={false}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ ...spring.gentle, delay: 0.2 }}
          >
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
          </motion.div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)]">
            <WikiNavigation
              activeSection={activeSection}
              hasMounted={hasMounted}
              isSearching={isSearching}
              isSidebarOpen={isSidebarOpen}
              navigationLabel={navigation}
              onSectionChange={handleSectionChange}
              onSidebarOpenChange={setIsSidebarOpen}
              sectionGroups={sectionGroups}
            />

            <motion.div
              className="min-w-0"
              initial={false}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ ...spring.gentle, delay: 0.25 }}
            >
              <div className={`${wikiPanelSurfaceClassName} rounded-2xl p-6 sm:p-8`}>
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
                    <motion.div
                      key={activeSection}
                      data-section={activeSection}
                      initial={false}
                      animate={{ opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }}
                      exit={{
                        opacity: 0,
                        x: sectionDirection === 0 ? 0 : sectionDirection * -12,
                        y: -10,
                        filter: 'blur(4px)',
                        transition: {
                          duration: 0.16,
                          ease: [0.4, 0, 1, 1] as [number, number, number, number],
                        },
                      }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="prose prose-invert prose-blue max-w-none"
                    >
                      <WikiOutlineLinks
                        items={activeOutline}
                        label={onThisPage}
                        onOpen={handleOutlineOpen}
                      />

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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
