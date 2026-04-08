'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, ChevronRight, Menu, X } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  iconMap,
  navContainer,
  navItem,
  popupItem,
  spring,
  wikiPanelSurfaceStyle,
} from '@/modules/wiki/lib/wiki-browser-config';
import type {
  WikiSectionGroupDefinition,
  WikiSectionId,
} from '@/modules/wiki/model/wiki-section-types';

interface IndicatorRect {
  height: number;
  top: number;
}

const selectionBackgroundStyle = {
  background: 'var(--theme-surface-hover)',
  border: '1px solid var(--theme-border-blue-accent, rgba(96,165,250,.25))',
} as const;

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
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </motion.span>
    </AnimatePresence>
  );
}

function ActivePill({ layoutId }: { layoutId: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      className="pointer-events-none absolute inset-0 z-0 rounded-lg"
      style={selectionBackgroundStyle}
      transition={spring.wobbly}
    />
  );
}

function FloatingActiveIndicator({ rect }: { rect: IndicatorRect | null }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {rect ? (
        <motion.div
          className="absolute right-0 left-0 rounded-lg"
          initial={false}
          animate={{
            height: rect.height,
            opacity: 1,
            top: rect.top,
          }}
          transition={spring.wobbly}
          style={selectionBackgroundStyle}
        />
      ) : null}
    </div>
  );
}

function measureIndicatorRect(
  container: HTMLElement | null,
  element: HTMLElement | null,
): IndicatorRect | null {
  if (!container || !element) {
    return null;
  }

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  return {
    height: elementRect.height,
    top: elementRect.top - containerRect.top,
  };
}

interface WikiNavigationProps {
  activeSection: WikiSectionId;
  hasMounted: boolean;
  isSearching: boolean;
  isSidebarOpen: boolean;
  navigationLabel: string;
  onSectionChange: (id: WikiSectionId) => void;
  onSidebarOpenChange: (isOpen: boolean) => void;
  sectionGroups: WikiSectionGroupDefinition[];
}

export function WikiNavigation({
  activeSection,
  hasMounted,
  isSearching,
  isSidebarOpen,
  navigationLabel,
  onSectionChange,
  onSidebarOpenChange,
  sectionGroups,
}: WikiNavigationProps) {
  const desktopStickyTop =
    'calc(var(--app-header-offset) + var(--viewport-top-inset) + var(--floating-gap))';
  const desktopStickyMaxHeight =
    'calc(var(--viewport-height-dynamic) - var(--app-header-offset) - var(--viewport-top-inset) - var(--viewport-bottom-inset) - 2rem)';
  const desktopScrollAreaMaxHeight =
    'calc(var(--viewport-height-dynamic) - var(--app-header-offset) - var(--viewport-top-inset) - var(--viewport-bottom-inset) - 7.5rem)';
  const desktopScrollViewportRef = useRef<HTMLDivElement | null>(null);
  const desktopButtonRefs = useRef(new Map<WikiSectionId, HTMLButtonElement>());
  const [desktopIndicatorRect, setDesktopIndicatorRect] = useState<IndicatorRect | null>(null);

  useLayoutEffect(() => {
    const updateDesktopIndicator = () => {
      if (isSearching) {
        setDesktopIndicatorRect(null);
        return;
      }

      setDesktopIndicatorRect(
        measureIndicatorRect(
          desktopScrollViewportRef.current,
          desktopButtonRefs.current.get(activeSection) ?? null,
        ),
      );
    };

    updateDesktopIndicator();

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateDesktopIndicator);

    if (desktopScrollViewportRef.current) {
      resizeObserver?.observe(desktopScrollViewportRef.current);
    }

    const activeButton = desktopButtonRefs.current.get(activeSection);
    if (activeButton) {
      resizeObserver?.observe(activeButton);
    }

    const viewportElement = desktopScrollViewportRef.current;
    viewportElement?.addEventListener('scroll', updateDesktopIndicator, { passive: true });
    window.addEventListener('resize', updateDesktopIndicator);

    return () => {
      viewportElement?.removeEventListener('scroll', updateDesktopIndicator);
      window.removeEventListener('resize', updateDesktopIndicator);
      resizeObserver?.disconnect();
    };
  }, [activeSection, isSearching]);

  const mobileFab = (
    <div className="safe-floating-bottom-right fixed z-50 flex flex-col items-end gap-2 lg:hidden">
      <AnimatePresence>
        {isSidebarOpen ? (
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
            className="w-48 rounded-2xl p-3"
            style={{
              ...wikiPanelSurfaceStyle,
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
                    className="mb-2 px-3 text-[11px] uppercase tracking-[0.18em]"
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
                          type="button"
                          variants={popupItem}
                          transition={spring.snappy}
                          onClick={() => onSectionChange(section.id)}
                          className="relative flex w-full items-center gap-2 rounded-lg px-3 py-2"
                          style={{
                            color: isActive
                              ? 'var(--theme-accent-blue)'
                              : 'var(--theme-text-muted-soft)',
                          }}
                          whileHover={{ x: 3, transition: spring.snappy }}
                          whileTap={{ scale: 0.95, transition: spring.snappy }}
                        >
                          {isActive ? <ActivePill layoutId="mobile-pill" /> : null}
                          <Icon className="relative z-10 h-4 w-4 shrink-0" />
                          <span className="relative z-10 text-sm font-medium">{section.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        onClick={() => onSidebarOpenChange(!isSidebarOpen)}
        className="rounded-full p-3.5 shadow-lg backdrop-blur-lg"
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
  );

  return (
    <>
      {hasMounted ? createPortal(mobileFab, document.body) : null}

      <aside className="hidden self-start lg:sticky lg:block" style={{ top: desktopStickyTop }}>
        <div
          className="rounded-2xl p-4"
          style={{
            ...wikiPanelSurfaceStyle,
            maxHeight: desktopStickyMaxHeight,
          }}
        >
          <h3 className="mb-4 px-2 font-semibold" style={{ color: 'var(--theme-text-heading)' }}>
            {navigationLabel}
          </h3>

          <div
            className="relative"
            style={{
              maxHeight: desktopScrollAreaMaxHeight,
            }}
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 right-1">
              <FloatingActiveIndicator rect={desktopIndicatorRect} />
            </div>

            <motion.nav
              className="space-y-5 overflow-x-hidden overflow-y-auto pr-1"
              variants={navContainer}
              initial="hidden"
              animate="show"
              ref={desktopScrollViewportRef}
              style={{
                maxHeight: desktopScrollAreaMaxHeight,
              }}
            >
              {sectionGroups.map((group) => (
                <div key={group.id}>
                  <p
                    className="mb-2 px-2 text-[11px] uppercase tracking-[0.2em]"
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
                          type="button"
                          ref={(element) => {
                            if (element) {
                              desktopButtonRefs.current.set(section.id, element);
                              return;
                            }

                            desktopButtonRefs.current.delete(section.id);
                          }}
                          variants={navItem}
                          onClick={() => onSectionChange(section.id)}
                          className="relative flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left"
                          style={{
                            color: isActive
                              ? 'var(--theme-accent-blue)'
                              : 'var(--theme-text-muted-soft)',
                            background: 'transparent',
                          }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.background = 'var(--theme-surface-hover)';
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.background = 'transparent';
                          }}
                          whileHover={{ x: isActive ? 0 : 4, transition: spring.snappy }}
                          whileTap={{ scale: 0.97, transition: spring.fab }}
                        >
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
                              <Icon className="h-4 w-4 shrink-0" />
                            </motion.span>
                          ) : (
                            <span className="relative z-10 mt-0.5">
                              <Icon className="h-4 w-4 shrink-0" />
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

                          <motion.span
                            className="relative z-10 mt-0.5 ml-auto flex h-4 w-4 shrink-0 items-center justify-center"
                            initial={false}
                            animate={{
                              opacity: isActive ? 1 : 0,
                              x: isActive ? 0 : -6,
                              rotate: isActive ? 0 : -20,
                            }}
                            transition={isActive ? spring.bouncy : { duration: 0.15 }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </motion.span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.nav>
          </div>
        </div>
      </aside>
    </>
  );
}
