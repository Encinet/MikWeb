'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Server, Users, Play, Map, BookOpen, Home, Building2, Globe, Sun, Moon, Shield } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { useTheme } from 'next-themes';
import MinecraftAvatar from './MinecraftAvatar';

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
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      backdropFilter: 'blur(16px) saturate(150%)',
      background: 'var(--glass-bg)',
      borderBottom: '1px solid var(--glass-border)',
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

          <div className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.path;

              const baseStyle = {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 0',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                textDecoration: 'none',
                position: 'relative' as const,
                borderBottom: '2px solid transparent'
              };

              if (item.link) {
                return (
                  <a
                    key={item.id}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      ...baseStyle,
                      background: item.highlight ? '#FFAA00' : 'transparent',
                      padding: item.highlight ? '8px 16px' : '8px 0',
                      borderRadius: item.highlight ? '8px' : '0',
                      color: item.highlight ? '#0e0e10' : 'var(--text-nav)',
                      fontWeight: item.highlight ? 600 : 500,
                      borderBottom: item.highlight ? 'none' : '2px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (item.highlight) {
                        e.currentTarget.style.background = '#e09900';
                      } else {
                        e.currentTarget.style.color = 'var(--text-nav-hover)';
                        e.currentTarget.style.borderBottom = '2px solid var(--border-nav-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (item.highlight) {
                        e.currentTarget.style.background = '#FFAA00';
                      } else {
                        e.currentTarget.style.color = 'var(--text-nav)';
                        e.currentTarget.style.borderBottom = '2px solid transparent';
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
                    ...baseStyle,
                    color: isActive ? 'var(--text-nav-active)' : 'var(--text-nav)',
                    borderBottom: isActive ? '2px solid #FFAA00' : '2px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-nav-hover)';
                    if (!isActive) {
                      e.currentTarget.style.borderBottom = '2px solid var(--border-nav-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isActive ? 'var(--text-nav-active)' : 'var(--text-nav)';
                    e.currentTarget.style.borderBottom = isActive ? '2px solid #FFAA00' : '2px solid transparent';
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
                  backdropFilter: 'blur(16px) saturate(150%)',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)',
                  padding: '12px',
                  zIndex: 100,
                  animation: 'fadeInDown 0.2s ease-out'
                }}>
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
  );
}
