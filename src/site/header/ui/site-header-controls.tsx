'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Globe, Menu, Monitor, Moon, Sun, UserRound, Users, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CSSProperties, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '@/modules/auth/model/use-auth';
import type { Player } from '@/modules/player/model/player-types';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { Link } from '@/shared/i18n/routing';

interface SiteHeaderControlsProps {
  isLoadingPlayers: boolean;
  isMobileMenuOpen: boolean;
  isOnline: boolean;
  locale: string;
  mounted: boolean;
  networkError: boolean;
  onLocaleSwitch: (locale: string) => void;
  onMobileMenuToggle: () => void;
  onPlayerDropdownClose: () => void;
  onPlayerDropdownOpen: () => void;
  onThemeToggle: () => void;
  playerCount: number;
  playerDropdownAnchorRef: RefObject<HTMLDivElement | null>;
  playerDropdownRect: DOMRect | null;
  playerDropdownVisible: boolean;
  players: Player[];
  statusNetworkErrorLabel: string;
  statusOfflineLabel: string;
  statusOnlineLabel: string;
  theme: string | undefined;
  themeTooltip: string;
}

const LOCALE_OPTIONS = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文（台灣）' },
  { value: 'zh-HK', label: '繁體中文（香港）' },
  { value: 'lzh', label: '文言' },
  { value: 'en', label: 'English' },
] as const;

function getLocaleShortLabel(locale: string): string {
  const map: Record<string, string> = {
    'zh-CN': '简',
    'zh-TW': '繁',
    'zh-HK': '港',
    lzh: '文',
    en: 'EN',
  };
  return map[locale] ?? locale;
}

export function SiteHeaderControls({
  isLoadingPlayers,
  isMobileMenuOpen,
  isOnline,
  locale,
  mounted,
  networkError,
  onLocaleSwitch,
  onMobileMenuToggle,
  onPlayerDropdownClose,
  onPlayerDropdownOpen,
  onThemeToggle,
  playerCount,
  playerDropdownAnchorRef,
  playerDropdownRect,
  playerDropdownVisible,
  players,
  statusNetworkErrorLabel,
  statusOfflineLabel,
  statusOnlineLabel,
  theme,
  themeTooltip,
}: SiteHeaderControlsProps) {
  const accountT = useTranslations('nav.account');
  const { account, authenticated, isLoading: isLoadingAuth } = useAuth();

  const [isLocaleDropdownOpen, setIsLocaleDropdownOpen] = useState(false);
  const [isLocaleDropdownVisible, setIsLocaleDropdownVisible] = useState(false);
  const [localeDropdownRect, setLocaleDropdownRect] = useState<DOMRect | null>(null);
  const localeAnchorRef = useRef<HTMLButtonElement | null>(null);
  const localeAnimFrameRef = useRef<number | null>(null);
  const localeCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isHoverDevice, setIsHoverDevice] = useState(false);
  useEffect(() => {
    setIsHoverDevice(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  const updateLocaleRect = useCallback(() => {
    if (localeAnchorRef.current) {
      setLocaleDropdownRect(localeAnchorRef.current.getBoundingClientRect());
    }
  }, []);

  const openLocaleDropdown = () => {
    if (localeCloseTimerRef.current !== null) {
      clearTimeout(localeCloseTimerRef.current);
      localeCloseTimerRef.current = null;
    }
    if (!isLocaleDropdownOpen) {
      updateLocaleRect();
      setIsLocaleDropdownOpen(true);
    }
  };

  const closeLocaleDropdown = () => {
    localeCloseTimerRef.current = setTimeout(() => {
      localeCloseTimerRef.current = null;
      setIsLocaleDropdownOpen(false);
    }, 150);
  };

  const toggleLocaleDropdown = () => {
    if (isLocaleDropdownOpen) {
      if (localeCloseTimerRef.current !== null) {
        clearTimeout(localeCloseTimerRef.current);
        localeCloseTimerRef.current = null;
      }
      setIsLocaleDropdownOpen(false);
    } else {
      openLocaleDropdown();
    }
  };

  useEffect(() => {
    if (!isLocaleDropdownOpen) {
      if (localeAnimFrameRef.current !== null) {
        cancelAnimationFrame(localeAnimFrameRef.current);
        localeAnimFrameRef.current = null;
      }
      return;
    }

    updateLocaleRect();
    localeAnimFrameRef.current = requestAnimationFrame(() => {
      localeAnimFrameRef.current = requestAnimationFrame(() => {
        setIsLocaleDropdownVisible(true);
      });
    });
    window.addEventListener('resize', updateLocaleRect);
    window.addEventListener('scroll', updateLocaleRect, true);

    return () => {
      if (localeAnimFrameRef.current !== null) {
        cancelAnimationFrame(localeAnimFrameRef.current);
        localeAnimFrameRef.current = null;
      }
      window.removeEventListener('resize', updateLocaleRect);
      window.removeEventListener('scroll', updateLocaleRect, true);
    };
  }, [isLocaleDropdownOpen, updateLocaleRect]);

  const hoverProps = isHoverDevice
    ? {
        onMouseEnter: openLocaleDropdown,
        onMouseLeave: closeLocaleDropdown,
        onFocus: openLocaleDropdown,
        onBlur: closeLocaleDropdown,
      }
    : {};

  return (
    <>
      <div className="project-navbar-controls flex shrink-0 items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="inline-flex items-center justify-center xl:hidden"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>

        <fieldset className="project-navbar-control-cluster">
          <legend className="sr-only">Display controls</legend>
          <button
            type="button"
            onClick={onThemeToggle}
            className="project-theme-toggle ui-nav-link hidden items-center gap-1.5 py-2 sm:inline-flex"
            title={themeTooltip}
          >
            {mounted ? (
              theme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : theme === 'light' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )
            ) : (
              <div className="h-4 w-4" />
            )}
          </button>

          <button
            ref={localeAnchorRef}
            type="button"
            {...hoverProps}
            onClick={toggleLocaleDropdown}
            className="project-locale-toggle ui-nav-link inline-flex items-center gap-1.5 py-2"
            title={LOCALE_OPTIONS.find((o) => o.value === locale)?.label ?? ''}
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{getLocaleShortLabel(locale)}</span>
          </button>
        </fieldset>

        {isLoadingAuth ? null : (
          <Link
            href={authenticated ? '/account' : '/login'}
            className={`project-account-link${
              authenticated && account
                ? ' project-account-link--signed-in'
                : ' project-account-link--signed-out'
            }`}
            title={authenticated && account ? account.currentName : accountT('login')}
            aria-label={authenticated && account ? account.currentName : accountT('login')}
          >
            {authenticated && account ? (
              <>
                <span className="project-account-avatar-frame">
                  <MinecraftAvatar
                    uuid={account.playerUuid}
                    name={account.currentName}
                    size={28}
                    className="project-account-avatar"
                  />
                </span>
                <span className="project-account-name">{account.currentName}</span>
              </>
            ) : (
              <>
                <span className="project-account-login-icon">
                  <UserRound className="h-4 w-4" />
                </span>
                <span className="project-account-login-label">{accountT('login')}</span>
              </>
            )}
          </Link>
        )}

        <div ref={playerDropdownAnchorRef} className="project-player-control relative">
          <button
            type="button"
            className="ui-nav-link inline-flex items-center gap-1.5 cursor-pointer sm:gap-2"
            aria-haspopup="true"
            aria-expanded={playerDropdownVisible}
            onMouseEnter={onPlayerDropdownOpen}
            onMouseLeave={onPlayerDropdownClose}
            onFocus={onPlayerDropdownOpen}
            onBlur={onPlayerDropdownClose}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                background: isOnline ? 'var(--theme-status-online)' : 'var(--theme-status-offline)',
                borderRadius: '50%',
                boxShadow: isOnline
                  ? '0 0 8px var(--theme-status-online-glow)'
                  : '0 0 8px var(--theme-status-offline-glow)',
              }}
            />
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {isLoadingPlayers || isOnline ? (
              <>
                <span
                  style={{
                    color: 'var(--theme-text-player-count)',
                    fontWeight: 600,
                    fontSize: 'clamp(1rem, 2vw, 1.125rem)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {isLoadingPlayers ? '-' : playerCount}
                </span>
                <span
                  className="hidden text-xs sm:inline sm:text-sm"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  {statusOnlineLabel}
                </span>
              </>
            ) : (
              <span className="text-xs sm:text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                {networkError ? statusNetworkErrorLabel : statusOfflineLabel}
              </span>
            )}
          </button>
        </div>
      </div>

      <PlayerDropdownPortal
        isOpen={mounted && playerDropdownVisible}
        players={players}
        playerDropdownRect={playerDropdownRect}
        statusOnlineLabel={statusOnlineLabel}
        onMouseEnter={onPlayerDropdownOpen}
        onMouseLeave={onPlayerDropdownClose}
      />

      <LocaleDropdownPortal
        isOpen={mounted && isLocaleDropdownOpen && isLocaleDropdownVisible}
        locale={locale}
        localeDropdownRect={localeDropdownRect}
        onSelect={onLocaleSwitch}
        onMouseEnter={openLocaleDropdown}
        onMouseLeave={closeLocaleDropdown}
      />
    </>
  );
}

function LocaleDropdownPortal({
  isOpen,
  locale,
  localeDropdownRect,
  onSelect,
  onMouseEnter,
  onMouseLeave,
}: {
  isOpen: boolean;
  locale: string;
  localeDropdownRect: DOMRect | null;
  onSelect: (locale: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  if (!localeDropdownRect) return null;

  const menuWidth = 188;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          role="menu"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.28, ease: 'easeInOut' }}
          style={
            {
              position: 'fixed',
              top: localeDropdownRect.bottom + 8,
              left: Math.max(8, localeDropdownRect.right - menuWidth),
              width: menuWidth,
              zIndex: 110,
              overflow: 'hidden',
              pointerEvents: 'auto',
            } as CSSProperties
          }
        >
          <div
            style={{
              borderRadius: '1.5rem',
              background: 'var(--theme-bg-base)',
              border: '0.5px solid var(--theme-border-glass)',
              padding: '0.5rem',
            }}
          >
            {LOCALE_OPTIONS.map((option, i) => {
              const active = option.value === locale;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitem"
                  onClick={() => onSelect(option.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    width: '100%',
                    cursor: 'pointer',
                    border: 'none',
                    borderRadius: '1rem',
                    fontSize: '0.938rem',
                    fontWeight: active ? 700 : 600,
                    color: active ? 'var(--theme-text-heading)' : 'var(--theme-text-muted)',
                    background: active ? 'var(--theme-surface-hover)' : 'transparent',
                    transition: 'background 0.12s, color 0.12s',
                    marginBottom: i === LOCALE_OPTIONS.length - 1 ? 0 : '1px',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--theme-surface-hover)';
                      e.currentTarget.style.color = 'var(--theme-text-heading)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--theme-text-muted)';
                    }
                  }}
                >
                  <span style={{ textAlign: 'left' }}>{option.label}</span>
                  {active ? (
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: 'var(--theme-accent-green-strong)',
                        flexShrink: 0,
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function PlayerDropdownPortal({
  isOpen,
  onMouseEnter,
  onMouseLeave,
  playerDropdownRect,
  players,
  statusOnlineLabel,
}: {
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  playerDropdownRect: DOMRect | null;
  players: Player[];
  statusOnlineLabel: string;
}) {
  if (!isOpen || !playerDropdownRect || players.length === 0) {
    return null;
  }

  return createPortal(
    <div
      className="player-list-dropdown"
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={
        {
          position: 'fixed',
          top: playerDropdownRect.bottom + 8,
          left: Math.min(Math.max(16, playerDropdownRect.right - 240), window.innerWidth - 256),
          minWidth: '240px',
          maxWidth: `min(320px, calc(100vw - 2rem - var(--viewport-right-inset)))`,
          zIndex: 100,
          opacity: 1,
          transform: 'translateY(0)',
          pointerEvents: 'auto',
          transition: 'opacity 0.18s ease-out, transform 0.18s ease-out',
        } as CSSProperties
      }
    >
      <div className="player-list-dropdown-surface">
        <div className="player-list-dropdown-scroll">
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--theme-text-muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {statusOnlineLabel} ({players.length})
          </div>
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.uuid}
                className="ui-list-row rounded-lg"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  cursor: 'default',
                }}
              >
                <MinecraftAvatar
                  uuid={player.uuid}
                  name={player.name}
                  size={28}
                  style={{
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                />
                <span
                  style={{
                    color: 'var(--theme-text-heading)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    flex: 1,
                  }}
                >
                  {player.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
