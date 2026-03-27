'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Building2,
  Globe,
  Home,
  MapIcon,
  Menu,
  Moon,
  Play,
  Shield,
  Sun,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { usePlayerContext } from '@/contexts/PlayerContext';
import { useHasMounted } from '@/hooks/useHasMounted';
import { Link, usePathname, useRouter } from '@/i18n/routing';

import MinecraftAvatar from './MinecraftAvatar';

export default function Navbar() {
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
  } = usePlayerContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlayerDropdownOpen, setIsPlayerDropdownOpen] = useState(false);
  const [isPlayerDropdownVisible, setIsPlayerDropdownVisible] = useState(false);
  const [playerDropdownRect, setPlayerDropdownRect] = useState<DOMRect | null>(null);
  const playerDropdownAnchorRef = useRef<HTMLDivElement | null>(null);
  const playerDropdownAnimationFrameRef = useRef<number | null>(null);

  const mounted = useHasMounted();

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navItems = [
    { id: 'home', icon: Home, label: t('home'), path: '/' },
    { id: 'buildings', icon: Building2, label: t('buildings'), path: '/buildings' },
    { id: 'bans', icon: Shield, label: t('bans'), path: '/bans' },
    { id: 'wiki', icon: BookOpen, label: t('wiki'), path: '/wiki' },
    {
      id: 'map',
      icon: MapIcon,
      label: t('map'),
      link: 'https://www.bilibili.com/video/BV1GJ411x7h7',
    },
    {
      id: 'apply',
      icon: Play,
      label: t('join'),
      link: 'https://mikapply.noctiro.moe',
      highlight: true,
    },
  ];

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
    setIsPlayerDropdownVisible(false);
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

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        padding: '1rem 0 0 0',
      }}
    >
      <nav
        style={{
          width: '100%',
          maxWidth: 'min(95%, 1400px)',
          backdropFilter: 'blur(16px) saturate(150%)',
          'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
          background: 'var(--theme-surface-glass)',
          border: '1px solid var(--theme-border-glass)',
          borderRadius: 'clamp(12px, 2vw, 24px)',
          boxShadow:
            '0 4px 24px var(--theme-shadow-glass), inset 0 1px 0 var(--theme-shadow-glass-inset)',
          transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Image
                src="/mik-standard-rounded.webp"
                alt="Mik Server Logo"
                width={48}
                height={48}
                className="w-8 h-8 sm:w-12 sm:h-12"
              />
              <div>
                <h1
                  style={{
                    fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                  }}
                >
                  <span style={{ color: '#FFAA00' }}>Mi</span>
                  <span style={{ color: 'var(--theme-text-logo-k)' }}>k</span>
                  <span
                    style={{
                      color: 'var(--theme-accent-brand-casual)',
                      marginLeft: 'clamp(0.25rem, 1vw, 0.5rem)',
                    }}
                  >
                    Casual
                  </span>
                </h1>
                <p
                  className="text-xs hidden sm:block"
                  style={{
                    color: 'var(--theme-text-muted)',
                    marginTop: '-2px',
                  }}
                >
                  {t('subtitle')}
                </p>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-6 relative">
              {navItems.map((item) => {
                const isActive = pathname === item.path;

                if (item.link) {
                  return (
                    <a
                      key={item.id}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: item.highlight ? '#FFAA00' : 'transparent',
                        padding: item.highlight ? '8px 16px' : '8px 0',
                        borderRadius: item.highlight ? '8px' : '0',
                        color: item.highlight ? '#0e0e10' : 'var(--theme-text-nav)',
                        fontSize: '14px',
                        fontWeight: item.highlight ? 600 : 500,
                        textDecoration: 'none',
                        transition: 'all 0.2s ease',
                        position: 'relative' as const,
                      }}
                      onMouseEnter={(e) => {
                        if (item.highlight) {
                          e.currentTarget.style.background = '#e09900';
                        } else {
                          e.currentTarget.style.color = 'var(--theme-text-nav-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (item.highlight) {
                          e.currentTarget.style.background = '#FFAA00';
                        } else {
                          e.currentTarget.style.color = 'var(--theme-text-nav)';
                        }
                      }}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.path as string}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 0',
                      color: isActive ? 'var(--theme-text-nav-active)' : 'var(--theme-text-nav)',
                      fontSize: '14px',
                      fontWeight: 500,
                      textDecoration: 'none',
                      transition: 'color 0.2s ease',
                      position: 'relative' as const,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--theme-text-nav-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = isActive
                        ? 'var(--theme-text-nav-active)'
                        : 'var(--theme-text-nav)';
                    }}
                  >
                    <item.icon className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">{item.label}</span>
                    {isActive && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ scaleX: 0 }}
                        className="absolute bottom-0 left-0 right-0 h-0.5"
                        style={{
                          backgroundColor: '#FFAA00',
                          transformOrigin: 'left',
                        }}
                        transition={{
                          duration: 0.3,
                          ease: 'easeInOut',
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg transition-colors"
                style={{
                  color: 'var(--theme-text-nav)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--theme-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={handleThemeToggle}
                className="hidden sm:flex"
                style={{
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--theme-text-nav-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--theme-text-nav)';
                }}
              >
                {mounted ? (
                  theme === 'dark' ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )
                ) : (
                  <div className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={switchLocale}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--theme-text-nav-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--theme-text-nav)';
                }}
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{locale === 'zh-CN' ? 'EN' : '中文'}</span>
              </button>

              <div ref={playerDropdownAnchorRef} className="relative">
                <button
                  type="button"
                  className="flex items-center gap-1.5 sm:gap-2 cursor-pointer"
                  aria-haspopup="true"
                  aria-expanded={isPlayerDropdownOpen}
                  onMouseEnter={openPlayerDropdown}
                  onMouseLeave={closePlayerDropdown}
                  onFocus={openPlayerDropdown}
                  onBlur={closePlayerDropdown}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      background: isOnline
                        ? 'var(--theme-status-online)'
                        : 'var(--theme-status-offline)',
                      borderRadius: '50%',
                      boxShadow: isOnline
                        ? '0 0 8px var(--theme-status-online-glow)'
                        : '0 0 8px var(--theme-status-offline-glow)',
                    }}
                  ></div>
                  <Users
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4"
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
                        className="text-xs sm:text-sm hidden sm:inline"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        {t('online')}
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
                        className="text-xs sm:text-sm hidden sm:inline"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        {t('online')}
                      </span>
                    </>
                  ) : (
                    <span
                      className="text-xs sm:text-sm"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      {networkError ? t('networkError') : t('offline')}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="lg:hidden overflow-hidden"
              >
                <div
                  className="mt-4 pt-4 border-t"
                  style={{ borderColor: 'var(--theme-border-glass)' }}
                >
                  <div className="flex flex-col space-y-2">
                    {navItems.map((item) => {
                      const isActive = pathname === item.path;

                      if (item.link) {
                        return (
                          <a
                            key={item.id}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                            style={{
                              background: item.highlight ? '#FFAA00' : 'var(--theme-surface-icon)',
                              color: item.highlight ? '#0e0e10' : 'var(--theme-text-nav)',
                              fontWeight: item.highlight ? 600 : 500,
                              border: `1px solid ${item.highlight ? 'transparent' : 'var(--theme-border-glass)'}`,
                            }}
                          >
                            <item.icon className="w-5 h-5" />
                            <span className="text-sm">{item.label}</span>
                          </a>
                        );
                      }

                      return (
                        <div key={item.id}>
                          <Link
                            href={item.path as string}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                            style={{
                              background: isActive
                                ? 'var(--theme-surface-hover)'
                                : 'var(--theme-surface-icon)',
                              color: isActive
                                ? 'var(--theme-text-nav-active)'
                                : 'var(--theme-text-nav)',
                              border: `1px solid ${isActive ? '#FFAA00' : 'var(--theme-border-glass)'}`,
                            }}
                          >
                            <item.icon className="w-5 h-5" />
                            <span className="text-sm">{item.label}</span>
                          </Link>
                        </div>
                      );
                    })}

                    {/* Mobile Theme Toggle */}
                    <button
                      type="button"
                      onClick={handleThemeToggle}
                      className="sm:hidden flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                      style={{
                        background: 'var(--theme-surface-icon)',
                        color: 'var(--theme-text-nav)',
                        border: '1px solid var(--theme-border-glass)',
                      }}
                    >
                      {mounted ? (
                        theme === 'dark' ? (
                          <Sun className="w-5 h-5" />
                        ) : (
                          <Moon className="w-5 h-5" />
                        )
                      ) : (
                        <div className="w-5 h-5" />
                      )}
                      <span className="text-sm">
                        {mounted && theme === 'dark' ? t('lightMode') : t('darkMode')}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {mounted &&
        isPlayerDropdownOpen &&
        players.length > 0 &&
        playerDropdownRect &&
        createPortal(
          <div
            className="player-list-dropdown"
            role="tooltip"
            onMouseEnter={openPlayerDropdown}
            onMouseLeave={closePlayerDropdown}
            style={
              {
                position: 'fixed',
                top: playerDropdownRect.bottom + 8,
                left: Math.max(16, playerDropdownRect.right - 240),
                minWidth: '240px',
                zIndex: 100,
                opacity: isPlayerDropdownVisible ? 1 : 0,
                transform: isPlayerDropdownVisible ? 'translateY(0)' : 'translateY(-6px)',
                pointerEvents: isPlayerDropdownVisible ? 'auto' : 'none',
                transition: 'opacity 0.18s ease-out, transform 0.18s ease-out',
              } as React.CSSProperties
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
                  {t('online')} ({players.length})
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
                        background: 'var(--theme-surface-icon)',
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
        )}
    </div>
  );
}
