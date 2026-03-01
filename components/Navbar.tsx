'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Server, Users, Play, Map, BookOpen, Home, Building2, Globe, Sun, Moon, Shield, Menu, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { useTheme } from 'next-themes';
import MinecraftAvatar from './MinecraftAvatar';
import { motion, AnimatePresence } from 'framer-motion';

interface Player {
  name: string;
  uuid: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('nav');
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleThemeToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/players');
        const data = await response.json();
        setPlayers(data.players || []);
        setPlayerCount(data.count || 0);
      } catch (error) {
        console.error('Failed to fetch players:', error);
      }
    };

    fetchPlayers();
    const interval = setInterval(fetchPlayers, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'home', icon: Home, label: t('home'), path: '/' },
    { id: 'buildings', icon: Building2, label: t('buildings'), path: '/buildings' },
    { id: 'bans', icon: Shield, label: t('bans'), path: '/bans' },
    { id: 'wiki', icon: BookOpen, label: t('wiki'), path: '/wiki' },
    { id: 'map', icon: Map, label: t('map'), link: 'https://map.mik-casual.com' },
    { id: 'apply', icon: Play, label: t('join'), link: 'https://mikapply.noctiro.moe', highlight: true }
  ];

  const switchLocale = () => {
    const newLocale = locale === 'zh-CN' ? 'en' : 'zh-CN';
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: 'flex',
      justifyContent: 'center',
      padding: '1rem 0 0 0'
    }}>
      <nav style={{
        width: '100%',
        maxWidth: 'min(95%, 1400px)',
        backdropFilter: 'blur(16px) saturate(150%)',
        WebkitBackdropFilter: 'blur(16px) saturate(150%)',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'clamp(12px, 2vw, 24px)',
        boxShadow: '0 4px 24px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)',
        transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease'
      }}>
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
              <h1 style={{
                fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
                fontWeight: 600,
                letterSpacing: '-0.02em'
              }}>
                <span style={{ color: '#FFAA00' }}>Mi</span>
                <span style={{ color: 'var(--logo-k)' }}>k</span>
                <span style={{ color: '#55FF55', marginLeft: 'clamp(0.25rem, 1vw, 0.5rem)' }}>Casual</span>
              </h1>
              <p className="text-xs hidden sm:block" style={{
                color: 'var(--text-muted)',
                marginTop: '-2px'
              }}>{t('subtitle')}</p>
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
                      color: item.highlight ? '#0e0e10' : 'var(--text-nav)',
                      fontSize: '14px',
                      fontWeight: item.highlight ? 600 : 500,
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      position: 'relative' as const
                    }}
                    onMouseEnter={(e) => {
                      if (item.highlight) {
                        e.currentTarget.style.background = '#e09900';
                      } else {
                        e.currentTarget.style.color = 'var(--text-nav-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (item.highlight) {
                        e.currentTarget.style.background = '#FFAA00';
                      } else {
                        e.currentTarget.style.color = 'var(--text-nav)';
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
                  href={item.path as any}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 0',
                    color: isActive ? 'var(--text-nav-active)' : 'var(--text-nav)',
                    fontSize: '14px',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'color 0.2s ease',
                    position: 'relative' as const
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-nav-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isActive ? 'var(--text-nav-active)' : 'var(--text-nav)';
                  }}
                >
                  <item.icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="navUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: '#FFAA00' }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{
                color: 'var(--text-nav)',
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              onClick={handleThemeToggle}
              className="hidden sm:flex"
              style={{
                alignItems: 'center',
                gap: '6px',
                padding: '8px 0',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-nav)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-nav-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-nav)';
              }}
            >
              {mounted ? (
                theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
              ) : (
                <div className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={switchLocale}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 0',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-nav)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-nav-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-nav)';
              }}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{locale === 'zh-CN' ? 'EN' : '中文'}</span>
            </button>

            <div
              className="relative"
              onMouseEnter={() => setShowPlayerList(true)}
              onMouseLeave={() => setShowPlayerList(false)}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: '#55FF55',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px rgba(85,255,85,0.5)'
                }}></div>
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'var(--text-nav)' }} />
                <span style={{
                  color: 'var(--text-player-count)',
                  fontWeight: 600,
                  fontSize: 'clamp(1rem, 2vw, 1.125rem)',
                  fontVariantNumeric: 'tabular-nums'
                }}>{playerCount}</span>
                <span className="text-xs sm:text-sm hidden sm:inline" style={{ color: 'var(--text-muted)' }}>{t('online')}</span>
              </div>

              {/* Player List Dropdown */}
              {showPlayerList && players.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: '240px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)',
                  padding: '16px',
                  zIndex: 100,
                  animation: 'fadeInDown 0.2s ease-out',
                  isolation: 'isolate'
                } as React.CSSProperties}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {t('online')} ({players.length})
                  </div>
                  <div className="space-y-2">
                    {players.map((player, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: 'var(--glass-icon-bg)',
                          border: '1px solid var(--glass-border)',
                          transition: 'all 0.2s ease',
                          cursor: 'default'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--glass-hover)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--glass-icon-bg)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <MinecraftAvatar
                          uuid={player.uuid}
                          name={player.name}
                          size={28}
                          style={{
                            borderRadius: '6px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                          }}
                        />
                        <span style={{
                          color: 'var(--text-secondary)',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          flex: 1
                        }}>{player.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="lg:hidden overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
                <div className="flex flex-col space-y-2">
                  {navItems.map((item, index) => {
                    const isActive = pathname === item.path;
  
                    if (item.link) {
                      return (
                        <a
                          key={item.id}
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                          style={{
                            background: item.highlight ? '#FFAA00' : 'var(--glass-icon-bg)',
                            color: item.highlight ? '#0e0e10' : 'var(--text-nav)',
                            fontWeight: item.highlight ? 600 : 500,
                            border: `1px solid ${item.highlight ? 'transparent' : 'var(--glass-border)'}`
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
                          href={item.path as any}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                          style={{
                            background: isActive ? 'var(--glass-hover)' : 'var(--glass-icon-bg)',
                            color: isActive ? 'var(--text-nav-active)' : 'var(--text-nav)',
                            border: `1px solid ${isActive ? '#FFAA00' : 'var(--glass-border)'}`
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
                    onClick={handleThemeToggle}
                    className="sm:hidden flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                    style={{
                      background: 'var(--glass-icon-bg)',
                      color: 'var(--text-nav)',
                      border: '1px solid var(--glass-border)'
                    }}
                  >
                    {mounted ? (
                      theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />
                    ) : (
                      <div className="w-5 h-5" />
                    )}
                    <span className="text-sm">{mounted && theme === 'dark' ? t('lightMode') : t('darkMode')}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      </nav>
    </div>
  );
}
