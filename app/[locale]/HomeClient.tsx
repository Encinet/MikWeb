'use client';

import { useState, useEffect } from 'react';
import { Users, Bell, Building2, Clock, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import ScrollReveal from '@/components/ScrollReveal';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { usePlayerData } from '@/contexts/PlayerContext';
import { useBuildingsData } from '@/contexts/BuildingsContext';

// 懒加载 framer-motion 仅用于公告模态框（减少初始 JS bundle）
const MotionDiv = dynamic(() => import('framer-motion').then(m => ({ default: m.motion.div })), { ssr: false });
const AnimatePresence = dynamic(() => import('framer-motion').then(m => ({ default: m.AnimatePresence })), { ssr: false });

export default function HomeClient() {
  const t = useTranslations();
  const locale = useLocale();
  const { playerCount } = usePlayerData();
  const { buildingsCount, fetchBuildings } = useBuildingsData();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  const SERVER_START_DATE = new Date('2025-07-15');
  const uptime = Math.floor((Date.now() - SERVER_START_DATE.getTime()) / (1000 * 60 * 60 * 24));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements');
        const data = await response.json();
        if (!response.ok || data.error) {
          setAnnouncements([]);
        } else if (Array.isArray(data)) {
          setAnnouncements(data);
        } else {
          setAnnouncements([]);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
        setAnnouncements([]);
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
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-20">
        {[
          { icon: Users, label: t('home.stats.activePlayers'), value: `${playerCount}`, iconColor: '#55FF55' },
          { icon: Building2, label: t('home.stats.totalBuildings'), value: `${buildingsCount}`, iconColor: '#FFAA00' },
          { icon: Clock, label: t('home.stats.uptime'), value: `${uptime}`, suffix: t('home.stats.days'), iconColor: '#55AAFF' }
        ].map((stat, i) => (
          <ScrollReveal key={i} delay={i * 0.1} direction="up">
            <div
              style={{
                backdropFilter: 'blur(16px) saturate(150%)',
                WebkitBackdropFilter: 'blur(16px) saturate(150%)',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '18px',
                boxShadow: '0 4px 24px var(--glass-shadow), inset 0 1px 0 var(--glass-inset)',
                padding: 'clamp(1.25rem, 3vw, 1.5rem)',
                transition: 'transform 0.25s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{
                width: 'clamp(2.5rem, 6vw, 3rem)',
                height: 'clamp(2.5rem, 6vw, 3rem)',
                borderRadius: '12px',
                backdropFilter: 'blur(16px) saturate(150%)',
                WebkitBackdropFilter: 'blur(16px) saturate(150%)',
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
              }}>
                {stat.value}
                {stat.suffix && <span style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)', marginLeft: '4px', fontWeight: 500 }}>{stat.suffix}</span>}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>{stat.label}</div>
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
            WebkitBackdropFilter: 'blur(16px) saturate(150%)',
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
              WebkitBackdropFilter: 'blur(16px) saturate(150%)',
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
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>{t('home.announcements.loading')}</p>
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
                    WebkitBackdropFilter: 'blur(16px) saturate(150%)',
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

      {/* Announcement Modal — framer-motion 仅在模态框打开后才加载 */}
      {mounted && createPortal(
        <AnimatePresence>
          {showAnnouncementModal && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(32px) saturate(180%)',
                WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem'
              }}
              onClick={() => setShowAnnouncementModal(false)}
            >
              <MotionDiv
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  background: 'var(--modal-bg)',
                  border: '1px solid var(--modal-border)',
                  borderRadius: '24px',
                  boxShadow: '0 24px 64px var(--modal-shadow), 0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 var(--modal-inset)',
                  maxWidth: '800px',
                  width: '100%',
                  maxHeight: '85vh',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
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
                      padding: '10px',
                      borderRadius: '14px',
                      backdropFilter: 'blur(16px) saturate(150%)',
                      WebkitBackdropFilter: 'blur(16px) saturate(150%)',
                      background: 'var(--glass-icon-bg)',
                      border: '1px solid var(--glass-border)',
                      boxShadow: '0 4px 12px rgba(255, 170, 0, 0.15)'
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
                      padding: '10px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--glass-icon-bg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                {/* Modal Content */}
                <div style={{ padding: 'clamp(1.5rem, 4vw, 2rem)', overflowY: 'auto', flex: 1 }}>
                  {isLoading ? (
                    <div className="text-center py-12">
                      <div style={{
                        display: 'inline-block',
                        width: '40px',
                        height: '40px',
                        border: '4px solid rgba(255, 170, 0, 0.2)',
                        borderTop: '4px solid #FFAA00',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.95rem' }}>{t('home.announcements.loading')}</p>
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{t('home.announcements.empty')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {announcements.map((announcement: any, i: number) => (
                        <div
                          key={i}
                          style={{
                            backdropFilter: 'blur(16px) saturate(150%)',
                            WebkitBackdropFilter: 'blur(16px) saturate(150%)',
                            background: 'var(--glass-icon-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '16px',
                            padding: 'clamp(1rem, 3vw, 1.5rem)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div style={{
                              width: '10px',
                              height: '10px',
                              marginTop: '8px',
                              background: '#FFAA00',
                              borderRadius: '50%',
                              flexShrink: 0,
                              boxShadow: '0 0 12px rgba(255, 170, 0, 0.6)'
                            }} />
                            <div className="flex-1 min-w-0">
                              <div style={{
                                fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                                color: 'var(--text-muted)',
                                marginBottom: '8px',
                                fontWeight: 500
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
              </MotionDiv>
            </MotionDiv>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
