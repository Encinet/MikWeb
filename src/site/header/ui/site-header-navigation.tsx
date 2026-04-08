'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { Link } from '@/shared/i18n/routing';
import type { SiteHeaderNavItem } from '@/site/header/lib/site-header-nav-item';

interface DesktopSiteHeaderNavigationProps {
  activePathname: string;
  items: SiteHeaderNavItem[];
  underlineDirection: -1 | 1;
  underlineDistance: number;
  underlineDuration: number;
  underlineInitialScale: number;
  underlineOrigin: 'left' | 'right';
}

export function DesktopSiteHeaderNavigation({
  activePathname,
  items,
  underlineDirection,
  underlineDistance,
  underlineDuration,
  underlineInitialScale,
  underlineOrigin,
}: DesktopSiteHeaderNavigationProps) {
  return (
    <div className="relative hidden items-center gap-4 whitespace-nowrap xl:flex xl:gap-6">
      {items.map((item) => {
        const isActive = activePathname === item.path;

        if (item.link) {
          return (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className={
                item.highlight
                  ? 'ui-nav-chip ui-nav-chip--highlight inline-flex items-center gap-3 whitespace-nowrap px-4 py-2'
                  : 'ui-nav-link inline-flex items-center gap-2 whitespace-nowrap py-2'
              }
              style={{
                position: 'relative',
              }}
            >
              <item.icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{item.label}</span>
            </a>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.path as string}
            className={`${isActive ? 'ui-nav-link ui-nav-link--active' : 'ui-nav-link'} relative inline-flex items-center gap-2 whitespace-nowrap py-2`}
            style={{
              position: 'relative',
            }}
          >
            <item.icon className="relative z-10 h-4 w-4" />
            <span className="relative z-10 whitespace-nowrap">{item.label}</span>
            {isActive ? (
              <motion.div
                key={`${item.id}-${underlineDirection}-${underlineDistance}`}
                className="absolute right-0 bottom-0 left-0 h-0.5"
                initial={{
                  scaleX: underlineInitialScale,
                  opacity: underlineDistance === 0 ? 0.75 : 0.92,
                }}
                animate={{
                  scaleX: 1,
                  opacity: 1,
                }}
                transition={{
                  scaleX: {
                    duration: underlineDuration,
                    ease: [0.18, 1, 0.3, 1],
                  },
                  opacity: {
                    duration: Math.min(0.2, underlineDuration),
                    ease: 'easeOut',
                  },
                }}
                style={{
                  backgroundColor: '#FFAA00',
                  boxShadow: '0 0 12px rgba(255, 170, 0, 0.28)',
                  transformOrigin: underlineOrigin,
                }}
              />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

interface MobileSiteHeaderMenuProps {
  activePathname: string;
  isOpen: boolean;
  items: SiteHeaderNavItem[];
  mounted: boolean;
  onClose: () => void;
  onThemeToggle: () => void;
  theme: string | undefined;
  themeDarkLabel: string;
  themeLightLabel: string;
}

export function MobileSiteHeaderMenu({
  activePathname,
  isOpen,
  items,
  mounted,
  onClose,
  onThemeToggle,
  theme,
  themeDarkLabel,
  themeLightLabel,
}: MobileSiteHeaderMenuProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden xl:hidden"
        >
          <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--theme-border-glass)' }}>
            <div className="flex flex-col space-y-2">
              {items.map((item) => {
                const isActive = activePathname === item.path;

                if (item.link) {
                  return (
                    <a
                      key={item.id}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className={`ui-nav-chip flex items-center gap-3 px-4 py-3 ${item.highlight ? 'ui-nav-chip--highlight' : ''}`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="whitespace-nowrap text-sm">{item.label}</span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.path as string}
                    onClick={onClose}
                    className={`ui-nav-chip flex items-center gap-3 px-4 py-3 ${isActive ? 'ui-nav-chip--active' : ''}`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="whitespace-nowrap text-sm">{item.label}</span>
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={onThemeToggle}
                className="ui-nav-chip flex items-center gap-3 px-4 py-3 sm:hidden"
              >
                <span className="text-sm">
                  {mounted && theme === 'dark' ? themeLightLabel : themeDarkLabel}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
