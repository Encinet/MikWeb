'use client';

import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { BookOpen, ChevronRight, Home, Menu, Shield, Users, Wrench, X, Zap } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

import type {
  WikiSectionContentMap,
  WikiSectionDefinition,
  WikiSectionIcon,
  WikiSectionId,
} from '@/lib/types';
import { isWikiSectionId } from '@/lib/wiki';

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
  sections: WikiSectionDefinition[];
  content: WikiSectionContentMap;
  initialSection?: WikiSectionId;
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
  sections,
  content,
  initialSection,
}: WikiContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const activeSection = useMemo(() => {
    const section = searchParams.get('section');

    if (section && isWikiSectionId(section) && content[section]) {
      return section;
    }

    return initialSection || sections[0]?.id || 'getting-started';
  }, [searchParams, content, initialSection, sections]);
  const sectionIndexMap = useMemo(() => {
    return new Map(sections.map((section, index) => [section.id, index]));
  }, [sections]);
  const [sectionDirection, setSectionDirection] = useState(0);

  // Scroll to hash target after markdown renders
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const decodedHash = decodeURIComponent(hash);
    const contentContainer = document.querySelector(`[data-section="${activeSection}"]`);

    const tryScroll = () => {
      // Find heading by text content (rehype-slug doesn't generate ids for Chinese text)
      const headings = contentContainer?.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (!headings) return false;
      for (const el of headings) {
        if (el.textContent?.trim() === decodedHash || el.textContent?.trim() === hash) {
          const top = el.getBoundingClientRect().top + window.scrollY - 160;
          window.scrollTo({ top, behavior: 'smooth' });
          return true;
        }
      }
      return false;
    };

    if (!tryScroll()) {
      const timer = setTimeout(tryScroll, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeSection]);

  const handleSectionChange = (id: WikiSectionId) => {
    if (id === activeSection) return;
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
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', id);
    router.replace(`?${params.toString()}`, { scroll: false });
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
                    className="space-y-1"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                    initial="hidden"
                    animate="show"
                  >
                    {sections.map((section) => {
                      const Icon = iconMap.get(section.icon) ?? BookOpen;
                      const isActive = activeSection === section.id;
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
                          <span className="text-sm font-medium relative z-10">{section.label}</span>
                        </motion.button>
                      );
                    })}
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
                  className="space-y-1"
                  variants={navContainer}
                  initial="hidden"
                  animate="show"
                >
                  {sections.map((section) => {
                    const Icon = iconMap.get(section.icon) ?? BookOpen;
                    const isActive = activeSection === section.id;
                    return (
                      <motion.button
                        key={section.id}
                        variants={navItem}
                        onClick={() => handleSectionChange(section.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg relative"
                        // ── original nav colors, no hover color change ──
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
                            className="relative z-10"
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
                          <span className="relative z-10">
                            <Icon className="w-4 h-4 shrink-0" />
                          </span>
                        )}

                        <span className="text-sm font-medium relative z-10">{section.label}</span>

                        <AnimatePresence>
                          {isActive && (
                            <motion.span
                              key="chevron"
                              className="ml-auto relative z-10"
                              initial={{ opacity: 0, x: -8, rotate: -30 }}
                              animate={{ opacity: 1, x: 0, rotate: 0, transition: spring.bouncy }}
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
                {/*
                  Exit  → whole block fades out fast (direction-aware slide).
                  Enter → each block (h1/h2/p/ul/…) springs in individually via markdownComponents.
                */}
                <AnimatePresence mode="wait" initial={false}>
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
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSlug]}
                      components={markdownComponents as object}
                    >
                      {content[activeSection]}
                    </ReactMarkdown>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
