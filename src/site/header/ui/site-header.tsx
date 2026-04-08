'use client';

import { BookOpen, Building2, Home, MapIcon, Play, Shield } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  const {
    players,
    playerCount,
    isOnline,
    isLoading: isLoadingPlayers,
    networkError,
  } = usePlayerStatus();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlayerDropdownOpen, setIsPlayerDropdownOpen] = useState(false);
  const [isPlayerDropdownVisible, setIsPlayerDropdownVisible] = useState(false);
  const [playerDropdownRect, setPlayerDropdownRect] = useState<DOMRect | null>(null);
  const playerDropdownAnchorRef = useRef<HTMLDivElement | null>(null);
  const playerDropdownAnimationFrameRef = useRef<number | null>(null);
  const previousActiveNavIndexRef = useRef<number | null>(null);

  const mounted = useHasMounted();

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navItems = useMemo<SiteHeaderNavItem[]>(
    () => [
      { id: 'home', icon: Home, label: t('items.home'), path: '/' },
      { id: 'buildings', icon: Building2, label: t('items.buildings'), path: '/buildings' },
      { id: 'bans', icon: Shield, label: t('items.bans'), path: '/bans' },
      { id: 'wiki', icon: BookOpen, label: t('items.wiki'), path: '/wiki' },
      {
        id: 'map',
        icon: MapIcon,
        label: t('items.map'),
        link: 'http://203.135.99.76:34567',
      },
      {
        id: 'apply',
        icon: Play,
        label: t('items.join'),
        link: 'https://mikapply.noctiro.moe',
        highlight: true,
      },
    ],
    [t],
  );
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
    router.replace(pathname, { locale: newLocale });
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
      className="safe-navbar-shell"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <nav
        className="ui-card-surface safe-navbar-card"
        style={{
          width: '100%',
          maxWidth: 'min(95%, 1400px)',
          borderRadius: 'clamp(12px, 2vw, 24px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
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
              localeLabel={locale === 'zh-CN' ? 'EN' : '中文'}
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
            />
          </div>

          <MobileSiteHeaderMenu
            activePathname={pathname}
            isOpen={isMobileMenuOpen}
            items={navItems}
            localeLabel={locale === 'zh-CN' ? 'Switch to English' : '切换到中文'}
            mounted={mounted}
            onClose={() => setIsMobileMenuOpen(false)}
            onLocaleSwitch={switchLocale}
            onThemeToggle={handleThemeToggle}
            theme={theme}
            themeDarkLabel={t('theme.dark')}
            themeLightLabel={t('theme.light')}
          />
        </div>
      </nav>
    </div>
  );
}
