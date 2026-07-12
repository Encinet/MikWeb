'use client';

import { BookOpen, Building2, Home, MapIcon, Play, Shield } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/modules/auth/model/use-auth';
import { usePlayerStatus } from '@/modules/player/model/use-player-status';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { usePathname, useRouter } from '@/shared/i18n/routing';
import type { SiteHeaderNavItem } from '@/site/header/lib/site-header-nav-item';
import { SiteHeaderBrand } from '@/site/header/ui/site-header-brand';
import { SiteHeaderControls } from '@/site/header/ui/site-header-controls';
import {
  DesktopSiteHeaderNavigation,
  MobileSiteHeaderMenu,
} from '@/site/header/ui/site-header-navigation';

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('nav');
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
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
  const [isPlayerDropdownOpen, setIsPlayerDropdownOpen] = useState(false);
  const [isPlayerDropdownVisible, setIsPlayerDropdownVisible] = useState(false);
  const [playerDropdownRect, setPlayerDropdownRect] = useState<DOMRect | null>(null);
  const playerDropdownAnchorRef = useRef<HTMLDivElement | null>(null);
  const playerDropdownAnimationFrameRef = useRef<number | null>(null);
  const navbarProgressAnimationFrameRef = useRef<number | null>(null);
  const navbarProgressTargetRef = useRef(0);
  const navbarProgressCurrentRef = useRef(0);
  const previousActiveNavIndexRef = useRef<number | null>(null);

  const mounted = useHasMounted();

  const nextThemeLabel =
    theme === 'dark' ? t('theme.light') : theme === 'light' ? t('theme.system') : t('theme.dark');
  const themeTooltip = mounted ? nextThemeLabel : '';

  const handleThemeToggle = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('system');
    } else {
      setTheme('dark');
    }
  };

  const navItems = useMemo<SiteHeaderNavItem[]>(() => {
    const items: SiteHeaderNavItem[] = [
      { id: 'home', icon: Home, label: t('items.home'), path: '/' },
      { id: 'buildings', icon: Building2, label: t('items.buildings'), path: '/buildings' },
      { id: 'wiki', icon: BookOpen, label: t('items.wiki'), path: '/wiki' },
      { id: 'map', icon: MapIcon, label: t('items.map'), path: '/map' },
      { id: 'bans', icon: Shield, label: t('items.bans'), path: '/bans' },
    ];

    if (!authenticated && !isLoadingAuth) {
      items.push({
        id: 'apply',
        icon: Play,
        label: t('items.join'),
        link: 'https://apply.mcmik.top',
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

  const switchLocale = (target: string) => {
    router.replace(pathname, { locale: target });
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
      className={`project-navbar-shell${isScrolled ? ' is-scrolled' : ''}`}
      style={
        {
          '--project-navbar-scroll-progress': navbarScrollProgress.toFixed(3),
        } as CSSProperties
      }
    >
      <nav className="project-navbar-card">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <SiteHeaderBrand subtitle={t('brand.subtitle')} />

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
              isOnline={isOnline}
              locale={locale}
              mounted={mounted}
              networkError={networkError}
              onLocaleSwitch={switchLocale}
              onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              onPlayerDropdownClose={closePlayerDropdown}
              onPlayerDropdownOpen={openPlayerDropdown}
              onThemeToggle={handleThemeToggle}
              playerCount={playerCount}
              playerDropdownAnchorRef={playerDropdownAnchorRef}
              playerDropdownRect={playerDropdownRect}
              playerDropdownVisible={isPlayerDropdownOpen && isPlayerDropdownVisible}
              players={players}
              statusNetworkErrorLabel={t('status.networkError')}
              statusOfflineLabel={t('status.offline')}
              statusOnlineLabel={t('status.online')}
              theme={theme}
              themeTooltip={themeTooltip}
            />
          </div>

          <MobileSiteHeaderMenu
            activePathname={pathname}
            isOpen={isMobileMenuOpen}
            items={navItems}
            onClose={() => setIsMobileMenuOpen(false)}
          />
        </div>
      </nav>
    </div>
  );
}
