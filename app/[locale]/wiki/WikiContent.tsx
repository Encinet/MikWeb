'use client';

import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  BookOpen,
  ChevronRight,
  Home,
  Menu,
  Search,
  Shield,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

import type {
  SearchableWikiBlock,
  WikiSectionContentMap,
  WikiSectionDefinition,
  WikiSectionGroupDefinition,
  WikiSectionIcon,
  WikiSectionId,
  WikiSectionOutlineItem,
  WikiSectionOutlineMap,
} from '@/lib/types';
import { searchWikiBlocks } from '@/lib/wikiSearch';

interface PendingWikiAnchor {
  heading: string;
  slug: string;
}

const iconMap = new Map<WikiSectionIcon, React.ComponentType<{ className?: string }>>([
  ['Home', Home],
  ['Wrench', Wrench],
  ['Shield', Shield],
  ['Users', Users],
  ['Zap', Zap],
]);

interface WikiContentProps {
  title: string;
  description: string;
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

const markdownDelays = {
  h1: 0.04,
  h2: 0.08,
  h3: 0.12,
  p: 0.16,
  list: 0.2,
  block: 0.24,
};

// Shared spring presets
const spring = {
  snappy: { type: 'spring' as const, stiffness: 500, damping: 30, mass: 0.8 },
  bouncy: { type: 'spring' as const, stiffness: 380, damping: 22, mass: 1 },
  gentle: { type: 'spring' as const, stiffness: 480, damping: 40, mass: 0.8 },
  wobbly: { type: 'spring' as const, stiffness: 280, damping: 18, mass: 0.9 },
  fab: { type: 'spring' as const, stiffness: 460, damping: 20, mass: 0.7 },
};

// Nav stagger
const navContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};
const navItem = {
  hidden: { opacity: 0, x: -14, filter: 'blur(4px)' },
  show: { opacity: 1, x: 0, filter: 'blur(0px)', transition: spring.snappy },
};

// Mobile popup nav items
const popupItem = {
  hidden: { opacity: 0, y: 10, scale: 0.92, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
};

// FAB icon swap
function FabIcon({ open }: { open: boolean }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={open ? 'close' : 'open'}
        initial={{ rotate: open ? -45 : 45, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1, transition: spring.fab }}
        exit={{ rotate: open ? 45 : -45, opacity: 0, scale: 0.6, transition: { duration: 0.14 } }}
        style={{ display: 'flex' }}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </motion.span>
    </AnimatePresence>
  );
}

// Active nav pill (layoutId driven)
function ActivePill({ layoutId }: { layoutId: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      className="absolute inset-0 rounded-lg"
      style={{
        background: 'var(--theme-surface-hover)',
        border: '1px solid var(--theme-border-blue-accent, rgba(96,165,250,.25))',
      }}
      transition={spring.wobbly}
    />
  );
}

export default function WikiContent({
  title,
  description,
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

  const markdownComponents = useMemo(() => {
    const baseMotionProps = {
      initial: { opacity: 0, y: 18, filter: 'blur(6px)' },
      animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    };

    return {
      h1: ({ children }: React.PropsWithChildren) => (
        <motion.h1
          {...baseMotionProps}
          transition={{ ...spring.gentle, delay: markdownDelays.h1 }}
          style={{
            color: 'var(--theme-text-heading)',
            borderColor: 'var(--theme-border-glass-light)',
          }}
          className="text-3xl font-bold mb-6 pb-3 border-b"
        >
          {children}
        </motion.h1>
      ),
      h2: ({ children }: React.PropsWithChildren) => (
        <motion.h2
          {...baseMotionProps}
          transition={{ ...spring.gentle, delay: markdownDelays.h2 }}
          style={{ color: 'var(--theme-text-heading)' }}
          className="text-2xl font-semibold mt-8 mb-4"
        >
          {children}
        </motion.h2>
      ),
      h3: ({ children }: React.PropsWithChildren) => (
        <motion.h3
          {...baseMotionProps}
          transition={{ ...spring.gentle, delay: markdownDelays.h3 }}
          style={{ color: 'var(--theme-text-primary)' }}
          className="text-xl font-semibold mt-6 mb-3"
        >
          {children}
        </motion.h3>
      ),
      p: ({ children }: React.PropsWithChildren) => (
        <motion.p
          {...baseMotionProps}
          transition={{ ...spring.gentle, delay: markdownDelays.p }}
          style={{ color: 'var(--theme-text-muted-strong)' }}
          className="leading-relaxed mb-4"
        >
          {children}
        </motion.p>
      ),
      ul: ({ children }: React.PropsWithChildren) => (
        <motion.ul
          {...baseMotionProps}
          transition={{ ...spring.gentle, delay: markdownDelays.list }}
          style={{ color: 'var(--theme-text-muted-strong)' }}
          className="list-disc list-inside space-y-2 mb-4"
        >
          {children}
        </motion.ul>
      ),
      ol: ({ children }: React.PropsWithChildren) => (
        <motion.ol
          {...baseMotionProps}
          transition={{ ...spring.gentle, delay: markdownDelays.list }}
          style={{ color: 'var(--theme-text-muted-strong)' }}
          className="list-decimal list-inside space-y-2 mb-4"
        >
          {children}
        </motion.ol>
      ),
      li: ({ children }: React.PropsWithChildren) => (
        <li style={{ color: 'var(--theme-text-muted-strong)' }} className="ml-4">
          {children}
        </li>
      ),
      blockquote: ({ children }: React.PropsWithChildren) => (
        <motion.blockquote
          {...baseMotionProps}
          transition={{ ...spring.gentle, delay: markdownDelays.block }}
          style={{
            background: 'var(--theme-surface-glass-light)',
            borderLeftColor: 'var(--theme-border-blue-accent)',
            borderColor: 'var(--theme-border-glass-light)',
          }}
          className="border-l-4 pl-4 py-1 my-4 rounded-lg border backdrop-blur-sm [&>p]:mb-0 [&>p:last-child]:mb-0"
        >
          {children}
        </motion.blockquote>
      ),
      pre: ({ children }: React.PropsWithChildren) => (
        <motion.pre
          {...baseMotionProps}
          transition={{ ...spring.gentle, delay: markdownDelays.block }}
          style={{
            background: 'var(--theme-surface-code-block)',
            borderColor: 'var(--theme-border-glass-light)',
          }}
          className="mb-4 rounded-lg overflow-x-auto border p-4"
        >
          {children}
        </motion.pre>
      ),
      code: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => {
        const isInline = !className;
        return isInline ? (
          <code
            style={{
              background: 'var(--theme-surface-code)',
              color: 'var(--theme-accent-blue-strong)',
            }}
            className="px-1.5 py-0.5 rounded text-sm font-mono"
          >
            {children}
          </code>
        ) : (
          <code
            style={{ color: 'var(--theme-accent-blue-strong)' }}
            className="text-sm font-mono block"
          >
            {children}
          </code>
        );
      },
      a: ({ children, href }: React.PropsWithChildren<{ href?: string }>) => (
        <a
          href={href}
          className="underline"
          style={{
            color: 'var(--theme-accent-blue-strong)',
            textUnderlineOffset: '3px',
            textDecorationThickness: '1.5px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--theme-accent-blue)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--theme-accent-blue-strong)';
          }}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),
      table: ({ children }: React.PropsWithChildren) => (
        <motion.div
          {...baseMotionProps}
          transition={{ ...spring.gentle, delay: markdownDelays.block }}
          className="overflow-x-auto my-4 rounded-lg border"
          style={{ borderColor: 'var(--theme-border-glass-light)' }}
        >
          <table className="min-w-full">{children}</table>
        </motion.div>
      ),
      thead: ({ children }: React.PropsWithChildren) => (
        <thead style={{ background: 'var(--theme-surface-glass-light)' }}>{children}</thead>
      ),
      th: ({ children }: React.PropsWithChildren) => (
        <th
          style={{
            color: 'var(--theme-text-heading)',
            borderColor: 'var(--theme-border-glass-light)',
          }}
          className="px-4 py-2 text-left font-semibold border-b"
        >
          {children}
        </th>
      ),
      td: ({ children }: React.PropsWithChildren) => (
        <td
          style={{
            color: 'var(--theme-text-muted-strong)',
            borderColor: 'var(--theme-border-light)',
          }}
          className="px-4 py-2 border-b"
        >
          {children}
        </td>
      ),
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* ── Header ── */}
          <motion.div
            className="text-center mb-8 sm:mb-12"
            initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ ...spring.gentle, delay: 0.05 }}
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <motion.div
                className="p-3 rounded-xl backdrop-blur-sm shadow-lg"
                style={{
                  background:
                    'linear-gradient(135deg, var(--theme-surface-blue-accent) 0%, rgba(255, 255, 255, 0) 100%)',
                  border: '1px solid var(--theme-border-blue-accent)',
                }}
                initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ ...spring.bouncy, delay: 0.1 }}
              >
                <BookOpen className="w-8 h-8" style={{ color: 'var(--theme-accent-blue)' }} />
              </motion.div>
              <motion.h1
                className="text-4xl sm:text-5xl font-bold"
                style={{ color: 'var(--theme-text-heading)' }}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring.snappy, delay: 0.15 }}
              >
                {title}
              </motion.h1>
            </div>
            <motion.p
              className="text-base sm:text-lg max-w-2xl mx-auto"
              style={{ color: 'var(--theme-text-muted-soft)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.gentle, delay: 0.22 }}
            >
              {description}
            </motion.p>
          </motion.div>

          <motion.div
            className="mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ ...spring.gentle, delay: 0.2 }}
          >
            <div className="max-w-3xl mx-auto relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                style={{ color: 'var(--theme-text-muted)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onCompositionStart={() => setIsSearchComposing(true)}
                onCompositionEnd={(event) => {
                  const nextQuery = event.currentTarget.value.trim();

                  setIsSearchComposing(false);
                  setSearchQuery(event.currentTarget.value);
                  setDebouncedSearchQuery(nextQuery);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-12 pr-12 py-3.5 rounded-xl backdrop-blur-md focus:outline-none transition-all"
                style={{
                  color: 'var(--theme-text-primary)',
                  background: 'var(--theme-surface-glass)',
                  border: '1px solid var(--theme-border-glass)',
                  boxShadow: 'var(--theme-shadow-card)',
                }}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--theme-text-muted-soft)' }}
                  aria-label={clearSearchLabel}
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          </motion.div>

          {/* ── Mobile FAB + popup ── */}
          <div className="lg:hidden fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  key="mobile-nav"
                  initial={{ opacity: 0, scale: 0.88, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0, transition: spring.bouncy }}
                  exit={{
                    opacity: 0,
                    scale: 0.88,
                    y: 12,
                    transition: {
                      duration: 0.18,
                      ease: [0.4, 0, 1, 1] as [number, number, number, number],
                    },
                  }}
                  className="rounded-2xl p-3 w-48"
                  style={{
                    backdropFilter: 'blur(16px) saturate(150%)',
                    'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
                    background: 'var(--theme-surface-glass)',
                    border: '1px solid var(--theme-border-glass)',
                    boxShadow: 'var(--theme-shadow-card)',
                    transformOrigin: 'bottom right',
                  }}
                >
                  <motion.nav
                    className="space-y-3"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                    initial="hidden"
                    animate="show"
                  >
                    {sectionGroups.map((group) => (
                      <div key={group.id}>
                        <p
                          className="px-3 mb-2 text-[11px] uppercase tracking-[0.18em]"
                          style={{ color: 'var(--theme-text-muted)' }}
                        >
                          {group.label}
                        </p>
                        <div className="space-y-1">
                          {group.sections.map((section) => {
                            const Icon = iconMap.get(section.icon) ?? BookOpen;
                            const isActive = !isSearching && activeSection === section.id;
                            return (
                              <motion.button
                                key={section.id}
                                variants={popupItem}
                                transition={spring.snappy}
                                onClick={() => handleSectionChange(section.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg relative"
                                style={{
                                  color: isActive
                                    ? 'var(--theme-accent-blue)'
                                    : 'var(--theme-text-muted-soft)',
                                }}
                                whileHover={{ x: 3, transition: spring.snappy }}
                                whileTap={{ scale: 0.95, transition: spring.snappy }}
                              >
                                {isActive && <ActivePill layoutId="mobile-pill" />}
                                <Icon className="w-4 h-4 shrink-0 relative z-10" />
                                <span className="text-sm font-medium relative z-10">
                                  {section.label}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </motion.nav>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3.5 rounded-full backdrop-blur-lg shadow-lg"
              style={{
                color: 'var(--theme-accent-blue)',
                background: 'var(--theme-surface-blue-accent)',
                border: '1px solid var(--theme-border-blue-accent)',
              }}
              whileHover={{ scale: 1.12, transition: spring.snappy }}
              whileTap={{ scale: 0.88, transition: spring.fab }}
            >
              <FabIcon open={isSidebarOpen} />
            </motion.button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* ── Desktop Sidebar ── */}
            <motion.div
              className="hidden lg:block lg:col-span-1"
              initial={{ opacity: 0, x: -24, filter: 'blur(6px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ ...spring.gentle, delay: 0.18 }}
            >
              <div
                className="rounded-2xl p-4 lg:sticky lg:top-36"
                style={{
                  backdropFilter: 'blur(16px) saturate(150%)',
                  'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
                  background: 'var(--theme-surface-glass)',
                  border: '1px solid var(--theme-border-glass)',
                  boxShadow: 'var(--theme-shadow-card)',
                }}
              >
                <h3
                  className="font-semibold mb-4 px-2"
                  style={{ color: 'var(--theme-text-heading)' }}
                >
                  {navigation}
                </h3>

                <motion.nav
                  className="space-y-5"
                  variants={navContainer}
                  initial="hidden"
                  animate="show"
                >
                  {sectionGroups.map((group) => (
                    <div key={group.id}>
                      <p
                        className="px-2 mb-2 text-[11px] uppercase tracking-[0.2em]"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        {group.label}
                      </p>

                      <div className="space-y-1">
                        {group.sections.map((section) => {
                          const Icon = iconMap.get(section.icon) ?? BookOpen;
                          const isActive = !isSearching && activeSection === section.id;
                          return (
                            <motion.button
                              key={section.id}
                              variants={navItem}
                              onClick={() => handleSectionChange(section.id)}
                              className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg relative text-left"
                              style={{
                                color: isActive
                                  ? 'var(--theme-accent-blue)'
                                  : 'var(--theme-text-muted-soft)',
                                background: 'transparent',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--theme-surface-hover)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                              }}
                              whileHover={{ x: isActive ? 0 : 4, transition: spring.snappy }}
                              whileTap={{ scale: 0.97, transition: spring.fab }}
                            >
                              {isActive && <ActivePill layoutId="desktop-pill" />}

                              {isActive ? (
                                <motion.span
                                  key={`${section.id}-${activeSection}`}
                                  className="relative z-10 mt-0.5"
                                  initial={{ rotate: -18, scale: 0.82, x: -6, y: 1 }}
                                  animate={{
                                    rotate: [-18, 10, -6, 0],
                                    scale: [0.82, 1.18, 0.97, 1],
                                    x: [-6, 2, -1, 0],
                                    y: [1, -1, 0, 0],
                                  }}
                                  transition={{
                                    duration: 0.52,
                                    times: [0, 0.42, 0.76, 1],
                                    ease: [0.22, 1, 0.36, 1],
                                  }}
                                >
                                  <Icon className="w-4 h-4 shrink-0" />
                                </motion.span>
                              ) : (
                                <span className="relative z-10 mt-0.5">
                                  <Icon className="w-4 h-4 shrink-0" />
                                </span>
                              )}

                              <span className="relative z-10 min-w-0">
                                <span className="block text-sm font-medium">{section.label}</span>
                                <span
                                  className="mt-1 block text-xs leading-relaxed"
                                  style={{ color: 'var(--theme-text-muted)' }}
                                >
                                  {section.description}
                                </span>
                              </span>

                              <AnimatePresence>
                                {isActive && (
                                  <motion.span
                                    key="chevron"
                                    className="ml-auto relative z-10 mt-0.5"
                                    initial={{ opacity: 0, x: -8, rotate: -30 }}
                                    animate={{
                                      opacity: 1,
                                      x: 0,
                                      rotate: 0,
                                      transition: spring.bouncy,
                                    }}
                                    exit={{
                                      opacity: 0,
                                      x: -6,
                                      rotate: -20,
                                      transition: { duration: 0.15 },
                                    }}
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </motion.nav>
              </div>
            </motion.div>

            {/* ── Content panel ── */}
            <motion.div
              className="lg:col-span-3"
              initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ ...spring.gentle, delay: 0.25 }}
            >
              <div
                className="rounded-2xl p-6 sm:p-8"
                style={{
                  backdropFilter: 'blur(16px) saturate(150%)',
                  'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
                  background: 'var(--theme-surface-glass)',
                  border: '1px solid var(--theme-border-glass)',
                  boxShadow: 'var(--theme-shadow-card)',
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isSearching ? (
                    <motion.div
                      key={`search-${activeSearchQuery}`}
                      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{
                        opacity: 0,
                        y: -8,
                        filter: 'blur(4px)',
                        transition: {
                          duration: 0.16,
                          ease: [0.4, 0, 1, 1] as [number, number, number, number],
                        },
                      }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="mb-6">
                        <p
                          className="text-sm uppercase tracking-[0.2em] mb-2"
                          style={{ color: 'var(--theme-text-muted)' }}
                        >
                          {searchResultsLabel}
                        </p>
                        <h2
                          className="text-2xl sm:text-3xl font-semibold"
                          style={{ color: 'var(--theme-text-heading)' }}
                        >
                          {searchResultsCountLabel}
                        </h2>
                      </div>

                      {searchResults.length > 0 ? (
                        <div className="space-y-4">
                          {searchResults.map((result) => (
                            <button
                              type="button"
                              key={`${result.sectionId}-${result.slug || result.heading}`}
                              onClick={() => handleSearchResultOpen(result)}
                              className="w-full text-left rounded-xl p-4 transition-all"
                              style={{
                                background: 'var(--theme-surface-glass-light)',
                                border: '1px solid var(--theme-border-glass-light)',
                              }}
                            >
                              <p
                                className="text-xs uppercase tracking-[0.16em] mb-2"
                                style={{ color: 'var(--theme-text-muted)' }}
                              >
                                {result.path}
                              </p>
                              <h3
                                className="text-lg font-semibold mb-2"
                                style={{ color: 'var(--theme-text-heading)' }}
                              >
                                {result.heading}
                              </h3>
                              <p
                                className="text-sm leading-relaxed"
                                style={{ color: 'var(--theme-text-muted-strong)' }}
                              >
                                {result.snippet}
                              </p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div
                          className="rounded-xl p-6 sm:p-8"
                          style={{
                            background: 'var(--theme-surface-glass-light)',
                            border: '1px solid var(--theme-border-glass-light)',
                          }}
                        >
                          <h3
                            className="text-xl font-semibold mb-3"
                            style={{ color: 'var(--theme-text-heading)' }}
                          >
                            {searchEmptyTitle}
                          </h3>
                          <p style={{ color: 'var(--theme-text-muted-strong)' }}>
                            {searchEmptyDescription}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key={activeSection}
                      data-section={activeSection}
                      initial={{
                        opacity: 0,
                        x: sectionDirection * 18,
                        y: 10,
                        filter: 'blur(4px)',
                      }}
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
                      {activeOutline.length > 0 ? (
                        <div
                          className="not-prose mb-8 border-b pb-5"
                          style={{ borderColor: 'var(--theme-border-glass-light)' }}
                        >
                          <p
                            className="mb-3 text-xs uppercase tracking-[0.2em]"
                            style={{ color: 'var(--theme-text-muted)' }}
                          >
                            {onThisPage}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {activeOutline.map((item) => {
                              const isCurrent = pendingAnchor?.slug === item.slug;

                              return (
                                <button
                                  type="button"
                                  key={`${item.slug}-${item.heading}`}
                                  onClick={() => handleOutlineOpen(item)}
                                  className="rounded-full px-3 py-1.5 text-sm transition-colors"
                                  style={{
                                    background: isCurrent
                                      ? 'var(--theme-surface-blue-accent)'
                                      : 'transparent',
                                    border: `1px solid ${
                                      isCurrent
                                        ? 'var(--theme-border-blue-accent)'
                                        : 'var(--theme-border-glass-light)'
                                    }`,
                                    color: isCurrent
                                      ? 'var(--theme-accent-blue)'
                                      : 'var(--theme-text-muted-strong)',
                                    paddingLeft: item.level === 3 ? '1rem' : '0.75rem',
                                  }}
                                >
                                  {item.level === 3 ? `↳ ${item.heading}` : item.heading}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSlug]}
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
