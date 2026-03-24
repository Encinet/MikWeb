'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, ChevronRight, Home, Wrench, Shield, Users, Zap, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';

const iconMap = { Home, Wrench, Shield, Users, Zap };

interface Section {
  id: string;
  icon: string;
  label: string;
}

interface WikiClientProps {
  title: string;
  description: string;
  navigation: string;
  sections: Section[];
  content: Record<string, string>;
  initialSection?: string;
}

// Shared spring presets
const spring = {
  snappy: { type: 'spring' as const, stiffness: 500, damping: 30, mass: 0.8 },
  bouncy: { type: 'spring' as const, stiffness: 380, damping: 22, mass: 1 },
  gentle: { type: 'spring' as const, stiffness: 480, damping: 40, mass: 0.8 },
  wobbly: { type: 'spring' as const, stiffness: 280, damping: 18, mass: 0.9 },
  fab:    { type: 'spring' as const, stiffness: 460, damping: 20, mass: 0.7 },
};

// Nav stagger
const navContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};
const navItem = {
  hidden: { opacity: 0, x: -14, filter: 'blur(4px)' },
  show:   { opacity: 1, x: 0,   filter: 'blur(0px)', transition: spring.snappy },
};

// Mobile popup nav items
const popupItem = {
  hidden: { opacity: 0, y: 10, scale: 0.92, filter: 'blur(4px)' },
  show:   { opacity: 1, y: 0,  scale: 1,    filter: 'blur(0px)' },
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
        background: 'var(--hover-bg)',
        border: '1px solid var(--blue-accent-border, rgba(96,165,250,.25))',
      }}
      transition={spring.wobbly}
    />
  );
}

export default function WikiClient({
  title,
  description,
  navigation,
  sections,
  content,
  initialSection,
}: WikiClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState(initialSection || sections[0]?.id || '');
  const [prevSection, setPrevSection] = useState(activeSection);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const dir =
    sections.findIndex(s => s.id === activeSection) >
    sections.findIndex(s => s.id === prevSection)
      ? 1 : -1;

  useEffect(() => {
    const section = searchParams.get('section');
    if (section && content[section]) {
      setPrevSection(activeSection);
      setActiveSection(section);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSectionChange = (id: string) => {
    if (id === activeSection) return;
    setPrevSection(activeSection);
    setActiveSection(id);
    setSidebarOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', id);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Per-block stagger
  // useMemo resets the counter `i` each time activeSection changes,
  // so blocks always start from delay=0 for the new section.
  const markdownComponents = useMemo(() => {
    let i = 0;
    const d = () => Math.min(i++ * 0.018, 0.25);

    const bm = {
      initial: { opacity: 0, y: 18, filter: 'blur(5px)' },
      animate: { opacity: 1, y: 0,  filter: 'blur(0px)' },
    };

    return {
      h1: ({ children }: React.PropsWithChildren) => (
        <motion.h1
          {...bm} transition={{ ...spring.gentle, delay: d() }}
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--glass-border-light)' }}
          className="text-3xl font-bold mb-6 pb-3 border-b"
        >{children}</motion.h1>
      ),
      h2: ({ children }: React.PropsWithChildren) => (
        <motion.h2
          {...bm} transition={{ ...spring.gentle, delay: d() }}
          style={{ color: 'var(--text-secondary)' }}
          className="text-2xl font-semibold mt-8 mb-4"
        >{children}</motion.h2>
      ),
      h3: ({ children }: React.PropsWithChildren) => (
        <motion.h3
          {...bm} transition={{ ...spring.gentle, delay: d() }}
          style={{ color: 'var(--text-primary)' }}
          className="text-xl font-semibold mt-6 mb-3"
        >{children}</motion.h3>
      ),
      p: ({ children }: React.PropsWithChildren) => (
        <motion.p
          {...bm} transition={{ ...spring.gentle, delay: d() }}
          style={{ color: 'var(--text-muted-lighter)' }}
          className="leading-relaxed mb-4"
        >{children}</motion.p>
      ),
      ul: ({ children }: React.PropsWithChildren) => (
        <motion.ul
          {...bm} transition={{ ...spring.gentle, delay: d() }}
          style={{ color: 'var(--text-muted-lighter)' }}
          className="list-disc list-inside space-y-2 mb-4"
        >{children}</motion.ul>
      ),
      ol: ({ children }: React.PropsWithChildren) => (
        <motion.ol
          {...bm} transition={{ ...spring.gentle, delay: d() }}
          style={{ color: 'var(--text-muted-lighter)' }}
          className="list-decimal list-inside space-y-2 mb-4"
        >{children}</motion.ol>
      ),
      li: ({ children }: React.PropsWithChildren) => (
        <li style={{ color: 'var(--text-muted-lighter)' }} className="ml-4">{children}</li>
      ),
      blockquote: ({ children }: React.PropsWithChildren) => (
        <motion.blockquote
          {...bm} transition={{ ...spring.gentle, delay: d() }}
          style={{
            background: 'var(--glass-bg-light)',
            borderLeftColor: 'var(--blue-accent-border)',
            borderColor: 'var(--glass-border-light)',
          }}
          className="border-l-4 pl-4 py-1 my-4 rounded-lg border backdrop-blur-sm [&>p]:mb-0 [&>p:last-child]:mb-0"
        >{children}</motion.blockquote>
      ),
      pre: ({ children }: React.PropsWithChildren) => (
        <motion.pre
          {...bm} transition={{ ...spring.gentle, delay: d() }}
          style={{ margin: 0 }} className="mb-4"
        >{children}</motion.pre>
      ),
      code: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => {
        const isInline = !className;
        return isInline ? (
          <code style={{ background: 'var(--code-bg)' }} className="text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">
            {children}
          </code>
        ) : (
          <code style={{ background: 'var(--code-block-bg)', borderColor: 'var(--glass-border-light)' }} className="block text-green-300 p-4 rounded-lg overflow-x-auto text-sm font-mono border">
            {children}
          </code>
        );
      },
      a: ({ children, href }: React.PropsWithChildren<{ href?: string }>) => (
        <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ),
      table: ({ children }: React.PropsWithChildren) => (
        <motion.div {...bm} transition={{ ...spring.gentle, delay: d() }} className="overflow-x-auto my-4 rounded-lg border" style={{ borderColor: 'var(--glass-border-light)' }}>
          <table className="min-w-full">
            {children}
          </table>
        </motion.div>
      ),
      thead: ({ children }: React.PropsWithChildren) => (
        <thead style={{ background: 'var(--glass-bg-light)' }}>{children}</thead>
      ),
      th: ({ children }: React.PropsWithChildren) => (
        <th style={{ color: 'var(--text-secondary)', borderColor: 'var(--glass-border-light)' }} className="px-4 py-2 text-left font-semibold border-b">{children}</th>
      ),
      td: ({ children }: React.PropsWithChildren) => (
        <td style={{ color: 'var(--text-muted-lighter)', borderColor: 'var(--border-light)' }} className="px-4 py-2 border-b">{children}</td>
      ),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

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
                className="p-3 rounded-xl bg-linear-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm border border-blue-400/30 shadow-lg"
                initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ ...spring.bouncy, delay: 0.1 }}
              >
                <BookOpen className="w-8 h-8 text-blue-400" />
              </motion.div>
              <motion.h1
                className="text-4xl sm:text-5xl font-bold"
                style={{ color: 'var(--text-secondary)' }}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring.snappy, delay: 0.15 }}
              >
                {title}
              </motion.h1>
            </div>
            <motion.p
              className="text-base sm:text-lg max-w-2xl mx-auto"
              style={{ color: 'var(--text-muted-light)' }}
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
              {sidebarOpen && (
                <motion.div
                  key="mobile-nav"
                  initial={{ opacity: 0, scale: 0.88, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0, transition: spring.bouncy }}
                  exit={{
                    opacity: 0, scale: 0.88, y: 12,
                    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as [number,number,number,number] },
                  }}
                  className="rounded-2xl p-3 w-48"
                  style={{
                    backdropFilter: 'blur(16px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(150%)',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--card-shadow)',
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
                      const Icon = iconMap[section.icon as keyof typeof iconMap];
                      const isActive = activeSection === section.id;
                      return (
                        <motion.button
                          key={section.id}
                          variants={popupItem}
                          transition={spring.snappy}
                          onClick={() => handleSectionChange(section.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg relative"
                          style={{ color: isActive ? 'var(--blue-accent)' : 'var(--text-muted-light)' }}
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
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-3.5 rounded-full backdrop-blur-lg bg-blue-500/20 border border-blue-400/30 shadow-lg"
              style={{ color: 'var(--blue-accent)' }}
              whileHover={{ scale: 1.12, transition: spring.snappy }}
              whileTap={{ scale: 0.88, transition: spring.fab }}
            >
              <FabIcon open={sidebarOpen} />
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
                  WebkitBackdropFilter: 'blur(16px) saturate(150%)',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                <h3 className="font-semibold mb-4 px-2" style={{ color: 'var(--text-secondary)' }}>
                  {navigation}
                </h3>

                <motion.nav className="space-y-1" variants={navContainer} initial="hidden" animate="show">
                  {sections.map((section) => {
                    const Icon = iconMap[section.icon as keyof typeof iconMap];
                    const isActive = activeSection === section.id;
                    return (
                      <motion.button
                        key={section.id}
                        variants={navItem}
                        onClick={() => handleSectionChange(section.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg relative"
                        // ── original nav colors, no hover color change ──
                        style={{
                          color: isActive ? 'var(--blue-accent)' : 'var(--text-muted-light)',
                          background: 'transparent',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        whileHover={{ x: isActive ? 0 : 4, transition: spring.snappy }}
                        whileTap={{ scale: 0.97, transition: spring.fab }}
                      >
                        {isActive && <ActivePill layoutId="desktop-pill" />}

                        <motion.span
                          className="relative z-10"
                          animate={{ rotate: isActive ? [0, -12, 8, -4, 0] : 0 }}
                          transition={isActive ? { duration: 0.45, ease: 'easeOut' } : {}}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                        </motion.span>

                        <span className="text-sm font-medium relative z-10">{section.label}</span>

                        <AnimatePresence>
                          {isActive && (
                            <motion.span
                              key="chevron"
                              className="ml-auto relative z-10"
                              initial={{ opacity: 0, x: -8, rotate: -30 }}
                              animate={{ opacity: 1, x: 0, rotate: 0, transition: spring.bouncy }}
                              exit={{ opacity: 0, x: -6, rotate: -20, transition: { duration: 0.15 } }}
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
                className="rounded-2xl p-6 sm:p-8 overflow-hidden"
                style={{
                  backdropFilter: 'blur(16px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(150%)',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                {/*
                  Exit  → whole block fades out fast (direction-aware slide).
                  Enter → each block (h1/h2/p/ul/…) springs in individually via markdownComponents.
                */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSection}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{
                      opacity: 0,
                      y: dir * -10,
                      filter: 'blur(4px)',
                      transition: {
                        duration: 0.16,
                        ease: [0.4, 0, 1, 1] as [number, number, number, number],
                      },
                    }}
                    className="prose prose-invert prose-blue max-w-none overflow-hidden"
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
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
