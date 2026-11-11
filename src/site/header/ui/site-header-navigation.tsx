'use client';

import { Globe } from 'lucide-react';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { Link } from '@/shared/i18n/navigation';
import type { SiteHeaderNavItem } from '@/site/header/lib/site-header-nav-item';
import { useMobileNavigation } from '@/site/header/model/use-mobile-navigation';

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
  const reducedMotion = useReducedMotion();
  return (
    <div className="project-navbar-links relative hidden items-center whitespace-nowrap xl:flex">
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
                  ? 'ui-nav-chip ui-nav-chip--highlight inline-flex items-center gap-2 whitespace-nowrap px-4 py-2'
                  : 'ui-nav-link inline-flex items-center gap-2 whitespace-nowrap py-2'
              }
              style={{ position: 'relative' }}
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
            aria-current={isActive ? 'page' : undefined}
            className={`${item.highlight ? 'ui-nav-chip ui-nav-chip--highlight px-4' : isActive ? 'ui-nav-link ui-nav-link--active' : 'ui-nav-link'} relative inline-flex items-center gap-2 whitespace-nowrap py-2`}
            style={{ position: 'relative' }}
          >
            <item.icon className="relative z-10 h-4 w-4" aria-hidden="true" />
            <span className="relative z-10 whitespace-nowrap">{item.label}</span>
            {isActive && !item.highlight ? (
              <m.div
                key={`${item.id}-${underlineDirection}-${underlineDistance}`}
                className="absolute right-0 bottom-0 left-0 h-0.5"
                initial={
                  reducedMotion
                    ? false
                    : {
                        scaleX: underlineInitialScale,
                        opacity: underlineDistance === 0 ? 0.75 : 0.92,
                      }
                }
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{
                  scaleX: {
                    duration: reducedMotion ? 0 : underlineDuration,
                    ease: [0.18, 1, 0.3, 1],
                  },
                  opacity: {
                    duration: reducedMotion ? 0 : Math.min(0.2, underlineDuration),
                    ease: 'easeOut',
                  },
                }}
                style={{
                  backgroundColor: 'var(--theme-accent-strong)',
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
  id: string;
  openerRef: RefObject<HTMLButtonElement | null>;
  activePathname: string;
  isOpen: boolean;
  items: SiteHeaderNavItem[];
  onClose: () => void;
  localeLabel: string;
  localeTarget: string;
  onLocaleSwitch: () => void;
}

export function MobileSiteHeaderMenu({
  id,
  openerRef,
  activePathname,
  isOpen,
  items,
  onClose,
  localeLabel,
  localeTarget,
  onLocaleSwitch,
}: MobileSiteHeaderMenuProps) {
  const mounted = useHasMounted();
  const reducedMotion = useReducedMotion();
  const surfaceRef = useRef<HTMLDivElement>(null);
  useMobileNavigation(surfaceRef, openerRef, isOpen && mounted, onClose);
  const controlsT = useTranslations('nav.controls');

  const menu = (
    <AnimatePresence>
      {isOpen ? (
        <m.div
          id={id}
          ref={surfaceRef}
          initial={reducedMotion ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.28, ease: 'easeInOut' }}
          className="mobile-menu-frame xl:hidden"
        >
          <div className="mobile-menu-panel">
            <div className="flex flex-col">
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
                      className={`${item.highlight ? 'ui-nav-chip ui-nav-chip--highlight inline-flex items-center gap-2' : 'ui-nav-link block'} py-3 px-4`}
                    >
                      {item.highlight && <item.icon className="h-4 w-4" />}
                      {item.label}
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.path as string}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={onClose}
                    className={`${item.highlight ? 'ui-nav-chip ui-nav-chip--highlight inline-flex items-center gap-2' : isActive ? 'ui-nav-link ui-nav-link--active block' : 'ui-nav-link block'} py-3 px-4`}
                  >
                    {item.highlight && <item.icon className="h-4 w-4" aria-hidden="true" />}
                    {item.label}
                  </Link>
                );
              })}
              <button
                type="button"
                className="mobile-menu-language"
                aria-label={controlsT('switchLanguage', { language: localeLabel })}
                onClick={() => {
                  onClose();
                  onLocaleSwitch();
                }}
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
                <span>{controlsT('language')}</span>
                <span lang={localeTarget}>{localeLabel}</span>
              </button>
            </div>
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(menu, document.body);
}
