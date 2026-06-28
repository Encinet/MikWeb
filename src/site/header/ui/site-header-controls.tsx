'use client';

import { Globe, Menu, Monitor, Moon, Sun, UserRound, Users, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CSSProperties, RefObject } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '@/modules/auth/model/use-auth';
import type { Player } from '@/modules/player/model/player-types';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { Link } from '@/shared/i18n/routing';

interface SiteHeaderControlsProps {
  isLoadingPlayers: boolean;
  isMobileMenuOpen: boolean;
  isOnline: boolean;
  localeLabel: string;
  localeTooltip: string;
  mounted: boolean;
  networkError: boolean;
  onLocaleSwitch: () => void;
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

export function SiteHeaderControls({
  isLoadingPlayers,
  isMobileMenuOpen,
  isOnline,
  localeLabel,
  localeTooltip,
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
            type="button"
            onClick={onLocaleSwitch}
            className="project-locale-toggle ui-nav-link inline-flex items-center gap-1.5 py-2"
            title={localeTooltip}
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{localeLabel}</span>
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
    </>
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
