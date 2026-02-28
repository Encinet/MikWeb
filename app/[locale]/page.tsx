'use client';

import React, { useState, useEffect } from 'react';
import { Server, Users, Bell, Zap, Play, Award, MessageCircle, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import ScrollReveal from '@/components/ScrollReveal';

export default function HomePage() {
  const t = useTranslations();
  const locale = useLocale();
  const [playerCount, setPlayerCount] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/players');
        const data = await response.json();
        setPlayerCount(data.count);
      } catch (error) {
        console.error('Failed to fetch player count:', error);
      }
    };

    fetchPlayers();
    const interval = setInterval(fetchPlayers, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements');
        const data = await response.json();
        setAnnouncements(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const formatDate = (timestamp: any) => {
    const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-20 animate-fadeIn">
          <div style={{
            display: 'inline-block',
            marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
            padding: '8px 24px',
            backdropFilter: 'blur(16px) saturate(150%)',
            background: 'var(--glass-bg)',
            borderRadius: '12px',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 4px 24px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)'
          }}>
            <div className="flex items-center gap-2" style={{ color: '#FFAA00' }}>
              <Zap className="w-4 h-4" />
              <span className="text-xs sm:text-sm" style={{ fontWeight: 400 }}>{t('home.hero.badge')}</span>
            </div>
          </div>

          <h2 style={{
            fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
            color: 'var(--text-primary)',
            padding: '0 1rem'
          }}>
            {t('home.hero.title')}
          </h2>

          <p style={{
            fontSize: 'clamp(0.9375rem, 2vw, 1.25rem)',
            lineHeight: 1.75,
            color: 'var(--text-muted)',
            maxWidth: '42rem',
            margin: '0 auto clamp(2rem, 5vw, 3rem)',
            padding: '0 1rem'
          }}>
            {t('home.hero.description')}
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4">
            <a
              href="https://mikapply.noctiro.moe"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 32px',
                background: '#FFAA00',
                color: 'var(--text-button)',
                fontWeight: 600,
                fontSize: 'clamp(0.9375rem, 2vw, 1.125rem)',
                borderRadius: '12px',
                border: 'none',
                textDecoration: 'none',
                transition: 'all 0.25s ease',
                width: '100%',
                maxWidth: '20rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e09900';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,170,0,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFAA00';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Play className="w-5 h-5" />
              <span>{t('home.hero.joinButton')}</span>
            </a>

            <div style={{
              backdropFilter: 'blur(16px) saturate(150%)',
              background: 'var(--glass-bg)',
              padding: '8px 24px',
              borderRadius: '12px',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)',
              fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)'
            }}>
              {t('home.hero.notice')}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-20">
          {[
            { icon: Users, label: t('home.stats.activePlayers'), value: `${playerCount}+`, iconColor: '#55FF55' },
            { icon: Server, label: t('home.stats.version'), value: '26.1', iconColor: '#FFAA00' },
            { icon: Zap, label: t('home.stats.status'), value: t('home.stats.running'), iconColor: '#55FF55' }
          ].map((stat, i) => (
            <ScrollReveal key={i} delay={i * 0.1} direction="up">
            <div
              key={i}
              style={{
                backdropFilter: 'blur(16px) saturate(150%)',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '18px',
                boxShadow: '0 4px 24px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)',
                padding: 'clamp(1.25rem, 3vw, 1.5rem)',
                transition: 'transform 0.25s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                width: 'clamp(2.5rem, 6vw, 3rem)',
                height: 'clamp(2.5rem, 6vw, 3rem)',
                borderRadius: '12px',
                backdropFilter: 'blur(16px) saturate(150%)',
                background: 'var(--glass-icon-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'clamp(0.75rem, 2vw, 1rem)'
              }}>
                <stat.icon style={{
                  width: 'clamp(1.25rem, 3vw, 1.5rem)',
                  height: 'clamp(1.25rem, 3vw, 1.5rem)',
                  color: stat.iconColor
                }} />
              </div>
              <div style={{
                fontSize: 'clamp(1.5rem, 4vw, 1.875rem)',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '4px'
              }}>{stat.value}</div>
              <div style={{
                color: 'var(--text-muted)',
                fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)'
              }}>{stat.label}</div>
            </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Announcements */}
        <ScrollReveal direction="up">
        <div
          onClick={() => setShowAnnouncementModal(true)}
          style={{
            backdropFilter: 'blur(16px) saturate(150%)',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '18px',
            boxShadow: '0 4px 24px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)',
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            marginBottom: 'clamp(3rem, 6vw, 5rem)',
            cursor: 'pointer',
            transition: 'all 0.25s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 8px 32px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 24px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)';
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div style={{
              padding: '8px',
              borderRadius: '12px',
              backdropFilter: 'blur(16px) saturate(150%)',
              background: 'var(--glass-icon-bg)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 4px 24px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)'
            }}>
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#FFAA00' }} />
            </div>
            <h3 style={{
              fontSize: 'clamp(1.5rem, 4vw, 1.875rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--text-secondary)'
            }}>{t('home.announcements.title')}</h3>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div style={{
                display: 'inline-block',
                width: '32px',
                height: '32px',
                border: '4px solid rgba(255, 170, 0, 0.3)',
                borderTop: '4px solid #FFAA00',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{
                color: 'var(--text-muted)',
                marginTop: '1rem'
              }}>{t('home.announcements.loading')}</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: 'var(--text-muted)' }}>{t('home.announcements.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {announcements.slice(0, 3).map((announcement: any, i: number) => (
                <div
                  key={i}
                  style={{
                    backdropFilter: 'blur(16px) saturate(150%)',
                    background: 'var(--glass-icon-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    padding: 'clamp(1rem, 3vw, 1.5rem)',
                    animation: 'slideIn 0.5s ease-out',
                    animationDelay: `${i * 0.1}s`,
                    animationFillMode: 'both'
                  }}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div style={{
                      width: '8px',
                      height: '8px',
                      marginTop: '8px',
                      background: '#FFAA00',
                      borderRadius: '50%',
                      flexShrink: 0
                    }}></div>
                    <div className="flex-1 min-w-0">
                      <div style={{
                        fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                        color: 'var(--text-muted)',
                        marginBottom: '8px'
                      }}>{formatDate(announcement.timestamp)}</div>
                      <div style={{
                        color: 'var(--text-primary)',
                        lineHeight: 1.75,
                        whiteSpace: 'pre-line',
                        fontSize: 'clamp(0.875rem, 2vw, 1rem)'
                      }}>{announcement.content}</div>
                    </div>
                  </div>
                </div>
              ))}
              {announcements.length > 3 && (
                <div style={{
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                  marginTop: '1rem'
                }}>
                  {t('home.announcements.clickToViewAll') || '点击查看全部公告'}
                </div>
              )}
            </div>
          )}
        </div>
        </ScrollReveal>

        {/* Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <ScrollReveal direction="left" delay={0.1}>
          <div style={{
            backdropFilter: 'blur(16px) saturate(150%)',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '18px',
            boxShadow: '0 4px 24px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)',
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            transition: 'transform 0.25s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div className="flex items-start gap-4 sm:gap-6">
              <div style={{
                padding: '12px',
                borderRadius: '12px',
                backdropFilter: 'blur(16px) saturate(150%)',
                background: 'var(--glass-icon-bg)',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 4px 24px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)',
                flexShrink: 0
              }}>
                <Award className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: '#FFAA00' }} />
              </div>
              <div className="flex-1">
                <h4 style={{
                  fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-secondary)',
                  marginBottom: 'clamp(0.75rem, 2vw, 1rem)'
                }}>{t('home.features.vanilla.title')}</h4>
                <p style={{
                  color: 'var(--text-muted)',
                  lineHeight: 1.75,
                  fontSize: 'clamp(0.875rem, 2vw, 1rem)'
                }}>
                  {t('home.features.vanilla.description')}
                </p>
              </div>
            </div>
          </div>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={0.1}>
          <div style={{
            backdropFilter: 'blur(16px) saturate(150%)',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '18px',
            boxShadow: '0 4px 24px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)',
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            transition: 'transform 0.25s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div className="flex items-start gap-4 sm:gap-6">
              <div style={{
                padding: '12px',
                borderRadius: '12px',
                backdropFilter: 'blur(16px) saturate(150%)',
                background: 'var(--glass-icon-bg)',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 4px 24px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)',
                flexShrink: 0
              }}>
                <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: '#55FF55' }} />
              </div>
              <div className="flex-1">
                <h4 style={{
                  fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-secondary)',
                  marginBottom: 'clamp(0.75rem, 2vw, 1rem)'
                }}>{t('home.features.community.title')}</h4>
                <p style={{
                  color: 'var(--text-muted)',
                  lineHeight: 1.75,
                  fontSize: 'clamp(0.875rem, 2vw, 1rem)'
                }}>
                  {t('home.features.community.description')}
                </p>
              </div>
            </div>
          </div>
          </ScrollReveal>
        </div>

        {/* Announcement Modal */}
        {showAnnouncementModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(20px) saturate(120%)',
              WebkitBackdropFilter: 'blur(20px) saturate(120%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={() => setShowAnnouncementModal(false)}
          >
            <div
              style={{
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '18px',
                boxShadow: '0 8px 48px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.3s ease-out'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                padding: 'clamp(1.5rem, 4vw, 2rem)',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    padding: '8px',
                    borderRadius: '12px',
                    backdropFilter: 'blur(16px) saturate(150%)',
                    background: 'var(--glass-icon-bg)',
                    border: '1px solid var(--glass-border)'
                  }}>
                    <Bell className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#FFAA00' }} />
                  </div>
                  <h3 style={{
                    fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'var(--text-secondary)'
                  }}>{t('home.announcements.title')}</h3>
                </div>
                <button
                  onClick={() => setShowAnnouncementModal(false)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--glass-icon-bg)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div style={{
                padding: 'clamp(1.5rem, 4vw, 2rem)',
                overflowY: 'auto',
                flex: 1
              }}>
                {isLoading ? (
                  <div className="text-center py-12">
                    <div style={{
                      display: 'inline-block',
                      width: '32px',
                      height: '32px',
                      border: '4px solid rgba(255, 170, 0, 0.3)',
                      borderTop: '4px solid #FFAA00',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <p style={{
                      color: 'var(--text-muted)',
                      marginTop: '1rem'
                    }}>{t('home.announcements.loading')}</p>
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-12">
                    <p style={{ color: 'var(--text-muted)' }}>{t('home.announcements.empty')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((announcement: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          backdropFilter: 'blur(16px) saturate(150%)',
                          background: 'var(--glass-icon-bg)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '12px',
                          padding: 'clamp(1rem, 3vw, 1.5rem)'
                        }}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div style={{
                            width: '8px',
                            height: '8px',
                            marginTop: '8px',
                            background: '#FFAA00',
                            borderRadius: '50%',
                            flexShrink: 0
                          }}></div>
                          <div className="flex-1 min-w-0">
                            <div style={{
                              fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                              color: 'var(--text-muted)',
                              marginBottom: '8px'
                            }}>{formatDate(announcement.timestamp)}</div>
                            <div style={{
                              color: 'var(--text-primary)',
                              lineHeight: 1.75,
                              whiteSpace: 'pre-line',
                              fontSize: 'clamp(0.875rem, 2vw, 1rem)'
                            }}>{announcement.content}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
