'use client';

import { Bell, Building2, Clock, Users, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import PlayerHistoryPanel from '@/components/PlayerHistoryPanel';
import ScrollReveal from '@/components/ScrollReveal';
import { useBuildingsContext } from '@/hooks/useBuildingsContext';
import { useHasMounted } from '@/hooks/useHasMounted';
import { usePlayerContext } from '@/hooks/usePlayerContext';
import { fetchValidatedJson } from '@/lib/clientApi';
import { homeGlassCardStyle } from '@/lib/homeCardStyles';
import type { AnnouncementItem } from '@/lib/types';
import { isAnnouncementItemArray } from '@/lib/types';

const MotionDiv = dynamic(() => import('framer-motion').then((m) => ({ default: m.motion.div })), {
  ssr: false,
});
const AnimatePresence = dynamic(
  () => import('framer-motion').then((m) => ({ default: m.AnimatePresence })),
  { ssr: false },
);

const SERVER_START_DATE = new Date('2025-07-15');

interface AnnouncementCardProps {
  announcement: AnnouncementItem;
  formattedDate: string;
  variant: 'preview' | 'modal';
  animationDelay?: string;
}

function AnnouncementCard({
  announcement,
  formattedDate,
  variant,
  animationDelay,
}: AnnouncementCardProps) {
  const isModal = variant === 'modal';

  return (
    <div
      className={isModal ? 'transition-transform hover:scale-[1.01]' : undefined}
      style={{
        backdropFilter: 'blur(16px) saturate(150%)',
        'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
        background: 'var(--theme-surface-icon)',
        border: '1px solid var(--theme-border-glass)',
        borderRadius: isModal ? '16px' : '12px',
        padding: 'clamp(1rem, 3vw, 1.5rem)',
        transition: isModal ? 'all 0.2s ease' : undefined,
        animation: animationDelay ? 'slideIn 0.5s ease-out' : undefined,
        animationDelay,
        animationFillMode: animationDelay ? 'both' : undefined,
      }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          style={{
            width: isModal ? '10px' : '8px',
            height: isModal ? '10px' : '8px',
            marginTop: '8px',
            background: '#FFAA00',
            borderRadius: '50%',
            flexShrink: 0,
            boxShadow: isModal ? '0 0 12px rgba(255, 170, 0, 0.6)' : undefined,
          }}
        />
        <div className="flex-1 min-w-0">
          <div
            style={{
              fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
              color: 'var(--theme-text-muted)',
              marginBottom: '8px',
              fontWeight: isModal ? 500 : undefined,
            }}
          >
            {formattedDate}
          </div>
          <div
            style={{
              color: 'var(--theme-text-primary)',
              lineHeight: 1.75,
              whiteSpace: 'pre-line',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
            }}
          >
            {announcement.content}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnouncementLoading({ label, modal }: { label: string; modal?: boolean }) {
  return (
    <div className="text-center py-12">
      <div
        style={{
          display: 'inline-block',
          width: modal ? '40px' : '32px',
          height: modal ? '40px' : '32px',
          border: modal ? '4px solid rgba(255, 170, 0, 0.2)' : '4px solid rgba(255, 170, 0, 0.3)',
          borderTop: '4px solid #FFAA00',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p
        style={{
          color: 'var(--theme-text-muted)',
          marginTop: '1rem',
          fontSize: modal ? '0.95rem' : undefined,
        }}
      >
        {label}
      </p>
    </div>
  );
}

function AnnouncementEmpty({ label, modal }: { label: string; modal?: boolean }) {
  return (
    <div className="text-center py-12">
      {modal && (
        <Bell
          className="w-12 h-12 mx-auto mb-4"
          style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }}
        />
      )}
      <p style={{ color: 'var(--theme-text-muted)', fontSize: modal ? '0.95rem' : undefined }}>
        {label}
      </p>
    </div>
  );
}

export default function HomeSection() {
  const t = useTranslations();
  const locale = useLocale();
  const {
    playerCount,
    isLoading: isLoadingPlayers,
    networkError: isNetworkError,
  } = usePlayerContext();
  const { buildingCount, fetchBuildings, lastUpdatedAt } = useBuildingsContext();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isAnnouncementsLoading, setIsAnnouncementsLoading] = useState(true);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [uptime, setUptime] = useState(0);

  const mounted = useHasMounted();

  useEffect(() => {
    const calculateUptime = () => {
      const now = Date.now();
      const up = Math.floor((now - SERVER_START_DATE.getTime()) / (1000 * 60 * 60 * 24));
      setUptime(up);
    };
    calculateUptime();
    const interval = setInterval(calculateUptime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const result = await fetchValidatedJson({
        url: '/api/announcements',
        validate: isAnnouncementItemArray,
        timeoutMs: 15_000,
        fallbackErrorMessage: 'Failed to load announcements',
      });

      if (result.status === 'success') {
        setAnnouncements(result.data);
      } else {
        if (result.status === 'network-error') {
          console.error('Failed to fetch announcements:', result.cause);
        }
        setAnnouncements([]);
      }
      setIsAnnouncementsLoading(false);
    };
    fetchAnnouncements();
  }, []);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAnnouncementKey = (announcement: AnnouncementItem) => {
    return `${announcement.timestamp}-${announcement.content.slice(0, 24)}`;
  };

  const stats = [
    {
      id: 'active-players',
      icon: Users,
      label: t('home.stats.activePlayers'),
      value: isLoadingPlayers || isNetworkError ? '-' : `${playerCount}`,
      iconColor: 'var(--theme-accent-green-strong)',
    },
    {
      id: 'total-buildings',
      icon: Building2,
      label: t('home.stats.totalBuildings'),
      value: lastUpdatedAt === null ? '-' : `${buildingCount}`,
      iconColor: '#FFAA00',
    },
    {
      id: 'uptime-days',
      icon: Clock,
      label: t('home.stats.uptime'),
      value: mounted && uptime > 0 ? `${uptime}` : '-',
      suffix: t('home.stats.days'),
      iconColor: '#55AAFF',
    },
  ];

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-20">
        {stats.map((stat, index) => (
          <ScrollReveal key={stat.id} delay={index * 0.1} direction="up">
            <div
              className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1"
              style={{
                ...homeGlassCardStyle,
                padding: 'clamp(1.25rem, 3vw, 1.5rem)',
              }}
            >
              <div
                style={{
                  width: 'clamp(2.5rem, 6vw, 3rem)',
                  height: 'clamp(2.5rem, 6vw, 3rem)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(16px) saturate(150%)',
                  'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
                  background: 'var(--theme-surface-icon)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
                }}
              >
                <stat.icon
                  style={{
                    width: 'clamp(1.25rem, 3vw, 1.5rem)',
                    height: 'clamp(1.25rem, 3vw, 1.5rem)',
                    color: stat.iconColor,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 'clamp(1.5rem, 4vw, 1.875rem)',
                  fontWeight: 600,
                  color: 'var(--theme-text-heading)',
                  marginBottom: '4px',
                }}
              >
                {stat.value}
                {stat.suffix && (
                  <span
                    style={{
                      fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                      marginLeft: '4px',
                      fontWeight: 500,
                    }}
                  >
                    {stat.suffix}
                  </span>
                )}
              </div>
              <div
                style={{
                  color: 'var(--theme-text-muted)',
                  fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                }}
              >
                {stat.label}
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <PlayerHistoryPanel />

      {/* Announcements */}
      <ScrollReveal direction="up">
        <button
          type="button"
          onClick={() => setIsAnnouncementModalOpen(true)}
          className="w-full text-left"
          style={{
            ...homeGlassCardStyle,
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            marginBottom: 'clamp(3rem, 6vw, 5rem)',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow =
              '0 8px 32px var(--theme-shadow-glass), inset 0 1px 0 var(--theme-shadow-glass-inset)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow =
              '0 4px 24px var(--theme-shadow-glass), inset 0 1px 0 var(--theme-shadow-glass-inset)';
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              style={{
                padding: '8px',
                borderRadius: '12px',
                backdropFilter: 'blur(16px) saturate(150%)',
                'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
                background: 'var(--theme-surface-icon)',
                border: '1px solid var(--theme-border-glass)',
                boxShadow:
                  '0 4px 24px var(--theme-shadow-glass), inset 0 1px 0 var(--theme-shadow-glass-inset)',
              }}
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#FFAA00' }} />
            </div>
            <h3
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 1.875rem)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--theme-text-heading)',
              }}
            >
              {t('home.announcements.section.title')}
            </h3>
          </div>

          {isAnnouncementsLoading ? (
            <AnnouncementLoading label={t('home.announcements.states.loading')} />
          ) : announcements.length === 0 ? (
            <AnnouncementEmpty label={t('home.announcements.states.empty')} />
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {announcements.slice(0, 3).map((announcement, index) => (
                <AnnouncementCard
                  key={getAnnouncementKey(announcement)}
                  announcement={announcement}
                  formattedDate={formatDate(announcement.timestamp)}
                  variant="preview"
                  animationDelay={`${index * 0.1}s`}
                />
              ))}
              {announcements.length > 3 && (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--theme-text-muted)',
                    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                    marginTop: '1rem',
                  }}
                >
                  {t('home.announcements.actions.viewAll')}
                </div>
              )}
            </div>
          )}
        </button>
      </ScrollReveal>

      {/* Announcement Modal — framer-motion 仅在模态框打开后才加载 */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isAnnouncementModalOpen && (
              <MotionDiv
                className="safe-fixed-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(32px) saturate(180%)',
                  'WebkitBackdropFilter': 'blur(32px) saturate(180%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                }}
                onClick={() => setIsAnnouncementModalOpen(false)}
              >
                <MotionDiv
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    backdropFilter: 'blur(24px) saturate(180%)',
                    'WebkitBackdropFilter': 'blur(24px) saturate(180%)',
                    background: 'var(--theme-surface-modal)',
                    border: '1px solid var(--theme-border-modal)',
                    borderRadius: '24px',
                    boxShadow:
                      '0 24px 64px var(--theme-shadow-modal), 0 8px 32px var(--theme-shadow-modal-soft), inset 0 1px 0 var(--theme-shadow-modal-inset)',
                    maxWidth: '800px',
                    width: '100%',
                    maxHeight: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div
                    style={{
                      padding: 'clamp(1.5rem, 4vw, 2rem)',
                      borderBottom: '1px solid var(--theme-border-glass)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          padding: '10px',
                          borderRadius: '14px',
                          backdropFilter: 'blur(16px) saturate(150%)',
                          'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
                          background: 'var(--theme-surface-icon)',
                          border: '1px solid var(--theme-border-glass)',
                          boxShadow: '0 4px 12px rgba(255, 170, 0, 0.15)',
                        }}
                      >
                        <Bell className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#FFAA00' }} />
                      </div>
                      <h3
                        style={{
                          fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
                          fontWeight: 600,
                          letterSpacing: '-0.02em',
                          color: 'var(--theme-text-heading)',
                        }}
                      >
                        {t('home.announcements.section.title')}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAnnouncementModalOpen(false)}
                      style={{
                        padding: '10px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--theme-text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--theme-text-primary)';
                        e.currentTarget.style.background = 'var(--theme-surface-icon)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--theme-text-muted)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div style={{ padding: 'clamp(1.5rem, 4vw, 2rem)', overflowY: 'auto', flex: 1 }}>
                    {isAnnouncementsLoading ? (
                      <AnnouncementLoading label={t('home.announcements.states.loading')} modal />
                    ) : announcements.length === 0 ? (
                      <AnnouncementEmpty label={t('home.announcements.states.empty')} modal />
                    ) : (
                      <div className="space-y-4">
                        {announcements.map((announcement) => (
                          <AnnouncementCard
                            key={getAnnouncementKey(announcement)}
                            announcement={announcement}
                            formattedDate={formatDate(announcement.timestamp)}
                            variant="modal"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </MotionDiv>
              </MotionDiv>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
