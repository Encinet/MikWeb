'use client';

import { Globe, Menu, Moon, Sun, Users, X } from 'lucide-react';
import type { CSSProperties, RefObject } from 'react';
import { createPortal } from 'react-dom';

import type { OnlinePlayer } from '@/modules/player/model/player-types';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

interface SiteHeaderControlsProps {
  isLoadingPlayers: boolean;
  isMobileMenuOpen: boolean;
  isOnline: boolean;
  localeLabel: string;
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
  players: OnlinePlayer[];
  statusNetworkErrorLabel: string;
  statusOfflineLabel: string;
  statusOnlineLabel: string;
  theme: string | undefined;
}

export function SiteHeaderControls({
  isLoadingPlayers,
  isMobileMenuOpen,
  isOnline,
  localeLabel,
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
}: SiteHeaderControlsProps) {
  return (
    <>
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="rounded-lg p-2 transition-colors xl:hidden"
          style={{
            color: 'var(--theme-text-nav)',
            background: 'transparent',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = 'var(--theme-surface-hover)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'transparent';
          }}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={onThemeToggle}
          className="hidden items-center gap-1.5 sm:flex"
          style={{
            padding: '8px 0',
            background: 'transparent',
            border: 'none',
            color: 'var(--theme-text-nav)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.color = 'var(--theme-text-nav-hover)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.color = 'var(--theme-text-nav)';
          }}
        >
          {mounted ? (
            theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onLocaleSwitch}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 0',
            background: 'transparent',
            border: 'none',
            color: 'var(--theme-text-nav)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.color = 'var(--theme-text-nav-hover)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.color = 'var(--theme-text-nav)';
          }}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{localeLabel}</span>
        </button>

        <div ref={playerDropdownAnchorRef} className="relative">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1.5 sm:gap-2"
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
            <Users
              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              style={{ color: 'var(--theme-text-nav)' }}
            />
            {isLoadingPlayers ? (
              <>
                <span
                  style={{
                    color: 'var(--theme-text-player-count)',
                    fontWeight: 600,
                    fontSize: 'clamp(1rem, 2vw, 1.125rem)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  -
                </span>
                <span
                  className="hidden text-xs sm:inline sm:text-sm"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  {statusOnlineLabel}
                </span>
              </>
            ) : isOnline ? (
              <>
                <span
                  style={{
                    color: 'var(--theme-text-player-count)',
                    fontWeight: 600,
                    fontSize: 'clamp(1rem, 2vw, 1.125rem)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {playerCount}
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
  players: OnlinePlayer[];
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
          left: Math.max(16, playerDropdownRect.right - 240),
          minWidth: '240px',
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
                className="transition-all hover:translate-x-1"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--theme-border-glass)',
                  transition: 'all 0.2s ease',
                  cursor: 'default',
                  backgroundColor: 'var(--theme-surface-icon)',
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
