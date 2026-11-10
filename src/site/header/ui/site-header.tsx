'use client';

import {
  BookOpen,
  Building2,
  ClipboardList,
  Home,
  MapIcon,
  MessageCircle,
  Play,
  Shield,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/modules/auth/model/use-auth';
import { usePlayerStatus } from '@/modules/player/model/use-player-status';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { getPathname, usePathname } from '@/shared/i18n/navigation';
import type { SiteHeaderNavItem } from '@/site/header/lib/site-header-nav-item';
import { useSiteHeaderBoundary } from '@/site/header/model/use-site-header-boundary';
import { SiteHeaderBrand } from '@/site/header/ui/site-header-brand';
import { SiteHeaderControls } from '@/site/header/ui/site-header-controls';
import {
  DesktopSiteHeaderNavigation,
  MobileSiteHeaderMenu,
} from '@/site/header/ui/site-header-navigation';

export default function SiteHeader() {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const { authenticated, isLoading: isLoadingAuth } = useAuth();
  const {
    players,
    playerCount,
    isOnline,
    isLoading: isLoadingPlayers,
    networkError,
  } = usePlayerStatus();
  const [isScrolled, setIsScrolled] = useState(false);
  const [navbarScrollProgress, setNavbarScrollProgress] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setIsMobileMenuOpen(false);
  }
  const mobileMenuId = useId();
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [isPlayerDropdownOpen, setIsPlayerDropdownOpen] = useState(false);
  const [isPlayerDropdownVisible, setIsPlayerDropdownVisible] = useState(false);
  const [playerDropdownRect, setPlayerDropdownRect] = useState<DOMRect | null>(null);
  const playerDropdownAnchorRef = useRef<HTMLDivElement | null>(null);
  const playerDropdownAnimationFrameRef = useRef<number | null>(null);
  const navbarProgressAnimationFrameRef = useRef<number | null>(null);
  const navbarProgressTargetRef = useRef(0);
  const navbarProgressCurrentRef = useRef(0);
  const previousActiveNavIndexRef = useRef<number | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  useSiteHeaderBoundary(headerRef);

  const mounted = useHasMounted();

  const localeTooltip = locale === 'zh-CN' ? 'English' : '中文 (简体)';

  const navItems = useMemo<SiteHeaderNavItem[]>(() => {
    const items: SiteHeaderNavItem[] = [
      { id: 'home', icon: Home, label: t('nav.items.home'), path: '/' },
      { id: 'buildings', icon: Building2, label: t('nav.items.buildings'), path: '/buildings' },
      { id: 'wiki', icon: BookOpen, label: t('nav.items.wiki'), path: '/wiki' },
      {
        id: 'notices',
        icon: ClipboardList,
        label: t('nav.items.notices'),
        path: '/community/notices',
      },
      { id: 'map', icon: MapIcon, label: t('map.title'), path: '/map' },
      { id: 'bans', icon: Shield, label: t('bans.title'), path: '/bans' },
    ];

    if (authenticated) {
      items.push({
        id: 'chat',
        icon: MessageCircle,
        label: t('chat.title'),
        path: '/chat',
        highlight: true,
      });
    } else if (!isLoadingAuth) {
      items.push({
        id: 'apply',
        icon: Play,
        label: t('nav.items.join'),
        path: '/join',
        highlight: true,
      });
    }

    return items;
  }, [authenticated, isLoadingAuth, t]);
  const activeDesktopNavIndex = navItems.findIndex((item) => item.path === pathname);
  const previousActiveDesktopNavIndex = previousActiveNavIndexRef.current;
  const desktopUnderlineDirection =
    previousActiveDesktopNavIndex === null ||
    activeDesktopNavIndex < 0 ||
    activeDesktopNavIndex >= previousActiveDesktopNavIndex
      ? 1
      : -1;
  const desktopUnderlineDistance =
    previousActiveDesktopNavIndex === null || activeDesktopNavIndex < 0
      ? 0
      : Math.abs(activeDesktopNavIndex - previousActiveDesktopNavIndex);
  const desktopUnderlineDuration =
    desktopUnderlineDistance === 0 ? 0.24 : Math.min(0.38, 0.18 + desktopUnderlineDistance * 0.05);
  const desktopUnderlineInitialScale =
    previousActiveDesktopNavIndex === null
      ? 0
      : Math.max(0.18, 0.32 - desktopUnderlineDistance * 0.04);
  const desktopUnderlineOrigin = (desktopUnderlineDirection === -1 ? 'right' : 'left') as
    | 'left'
    | 'right';

  const switchLocale = () => {
    const newLocale = locale === 'zh-CN' ? 'en' : 'zh-CN';
    // A locale change replaces the root document, including its pre-paint initialization.
    const target = getPathname({ href: pathname, locale: newLocale });
    window.location.replace(`${target}${window.location.search}${window.location.hash}`);
  };

  const updatePlayerDropdownRect = useCallback(() => {
    if (playerDropdownAnchorRef.current) {
      setPlayerDropdownRect(playerDropdownAnchorRef.current.getBoundingClientRect());
    }
  }, []);

  const openPlayerDropdown = () => {
    setIsPlayerDropdownVisible(false);
    updatePlayerDropdownRect();
    setIsPlayerDropdownOpen(true);
  };

  const closePlayerDropdown = () => {
    setIsPlayerDropdownVisible(false);
    setIsPlayerDropdownOpen(false);
  };

  useEffect(() => {
    const scrollRange = 240;
    const smoothProgress = (value: number) => value * value * (3 - 2 * value);

    const stopAnimation = () => {
      if (navbarProgressAnimationFrameRef.current !== null) {
        cancelAnimationFrame(navbarProgressAnimationFrameRef.current);
        navbarProgressAnimationFrameRef.current = null;
      }
    };

    const step = () => {
      const current = navbarProgressCurrentRef.current;
      const target = navbarProgressTargetRef.current;
      const delta = target - current;

      if (Math.abs(delta) < 0.001) {
        navbarProgressCurrentRef.current = target;
        setNavbarScrollProgress(target);
        setIsScrolled(target >= 0.999);
        navbarProgressAnimationFrameRef.current = null;
        return;
      }

      const next = current + delta * 0.12;
      navbarProgressCurrentRef.current = next;
      setNavbarScrollProgress(next);
      setIsScrolled(next >= 0.999);
      navbarProgressAnimationFrameRef.current = requestAnimationFrame(step);
    };

    const syncScrollProgress = () => {
      const rawProgress = Math.min(1, window.scrollY / scrollRange);
      navbarProgressTargetRef.current = smoothProgress(rawProgress);

      if (navbarProgressAnimationFrameRef.current === null) {
        navbarProgressAnimationFrameRef.current = requestAnimationFrame(step);
      }
    };

    syncScrollProgress();
    window.addEventListener('scroll', syncScrollProgress, { passive: true });
    window.addEventListener('resize', syncScrollProgress, { passive: true });

    return () => {
      stopAnimation();
      window.removeEventListener('scroll', syncScrollProgress);
      window.removeEventListener('resize', syncScrollProgress);
    };
  }, []);

  useEffect(() => {
    if (!isPlayerDropdownOpen) {
      if (playerDropdownAnimationFrameRef.current !== null) {
        cancelAnimationFrame(playerDropdownAnimationFrameRef.current);
        playerDropdownAnimationFrameRef.current = null;
      }
      return;
    }

    const syncDropdownPosition = () => {
      updatePlayerDropdownRect();
    };

    syncDropdownPosition();
    playerDropdownAnimationFrameRef.current = requestAnimationFrame(() => {
      playerDropdownAnimationFrameRef.current = requestAnimationFrame(() => {
        setIsPlayerDropdownVisible(true);
      });
    });
    window.addEventListener('resize', syncDropdownPosition);
    window.addEventListener('scroll', syncDropdownPosition, true);

    return () => {
      if (playerDropdownAnimationFrameRef.current !== null) {
        cancelAnimationFrame(playerDropdownAnimationFrameRef.current);
        playerDropdownAnimationFrameRef.current = null;
      }
      window.removeEventListener('resize', syncDropdownPosition);
      window.removeEventListener('scroll', syncDropdownPosition, true);
    };
  }, [isPlayerDropdownOpen, updatePlayerDropdownRect]);

  useEffect(() => {
    previousActiveNavIndexRef.current = activeDesktopNavIndex >= 0 ? activeDesktopNavIndex : null;
  }, [activeDesktopNavIndex]);

  return (
    <div
      ref={headerRef}
      className={`project-navbar-shell${isScrolled ? ' is-scrolled' : ''}${pathname === '/wiki' || pathname === '/map' ? ' is-docked-page' : ''}`}
      style={
        {
          '--project-navbar-scroll-progress': navbarScrollProgress.toFixed(3),
        } as CSSProperties
      }
    >
      <nav className="project-navbar-card">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="project-navbar-row flex items-center justify-between">
            <SiteHeaderBrand subtitle={t('nav.brand.subtitle')} />

            <DesktopSiteHeaderNavigation
              activePathname={pathname}
              items={navItems}
              underlineDirection={desktopUnderlineDirection}
              underlineDistance={desktopUnderlineDistance}
              underlineDuration={desktopUnderlineDuration}
              underlineInitialScale={desktopUnderlineInitialScale}
              underlineOrigin={desktopUnderlineOrigin}
            />

            <SiteHeaderControls
              isLoadingPlayers={isLoadingPlayers}
              isMobileMenuOpen={isMobileMenuOpen}
              mobileMenuId={mobileMenuId}
              mobileMenuButtonRef={mobileMenuButtonRef}
              isOnline={isOnline}
              localeLabel={locale === 'zh-CN' ? 'English' : '中文'}
              localeTarget={locale === 'zh-CN' ? 'en' : 'zh-CN'}
              localeTooltip={localeTooltip}
              mounted={mounted}
              networkError={networkError}
              onLocaleSwitch={switchLocale}
              onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              onPlayerDropdownClose={closePlayerDropdown}
              onPlayerDropdownOpen={openPlayerDropdown}
              playerCount={playerCount}
              playerDropdownAnchorRef={playerDropdownAnchorRef}
              playerDropdownRect={playerDropdownRect}
              playerDropdownVisible={isPlayerDropdownOpen && isPlayerDropdownVisible}
              players={players}
              statusNetworkErrorLabel={t('common.states.networkError')}
              statusOfflineLabel={t('common.states.offline')}
              statusOnlineLabel={t('common.states.online')}
            />
          </div>

          <MobileSiteHeaderMenu
            id={mobileMenuId}
            openerRef={mobileMenuButtonRef}
            activePathname={pathname}
            isOpen={isMobileMenuOpen}
            items={navItems}
            onClose={() => setIsMobileMenuOpen(false)}
            localeLabel={locale === 'zh-CN' ? 'English' : '中文'}
            localeTarget={locale === 'zh-CN' ? 'en' : 'zh-CN'}
            onLocaleSwitch={switchLocale}
          />
        </div>
      </nav>
    </div>
  );
}
