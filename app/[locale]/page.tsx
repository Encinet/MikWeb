import { Award, MessageCircle, Play, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import ScrollReveal from '@/components/ScrollReveal';

import HomeSection from './HomeSection';

export default async function HomePage() {
  const t = await getTranslations();

  return (
    <div className="page-shell">
      <div className="max-w-7xl mx-auto">
        {/* ── Hero Section (SSR — 立即渲染，直接改善 LCP) ── */}
        <div className="text-center mb-12 sm:mb-20 animate-fadeIn">
          <div
            style={{
              display: 'inline-block',
              marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
              padding: '8px 24px',
              backdropFilter: 'blur(16px) saturate(150%)',
              'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
              background: 'var(--theme-surface-glass)',
              borderRadius: '12px',
              border: '1px solid var(--theme-border-glass)',
              boxShadow:
                '0 4px 24px var(--theme-shadow-glass), inset 0 1px 0 var(--theme-shadow-glass-inset)',
            }}
          >
            <div className="flex items-center gap-2" style={{ color: '#FFAA00' }}>
              <Zap className="w-4 h-4" />
              <span className="text-xs sm:text-sm" style={{ fontWeight: 400 }}>
                {t('home.hero.badge')}
              </span>
            </div>
          </div>

          <h2
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
              color: 'var(--theme-text-primary)',
              padding: '0 1rem',
            }}
          >
            {t('home.hero.title')}
          </h2>

          <p
            style={{
              fontSize: 'clamp(0.9375rem, 2vw, 1.25rem)',
              lineHeight: 1.75,
              color: 'var(--theme-text-muted)',
              maxWidth: '42rem',
              margin: '0 auto clamp(2rem, 5vw, 3rem)',
              padding: '0 1rem',
            }}
          >
            {t('home.hero.description')}
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4">
            <a
              href="https://mikapply.noctiro.moe"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-join-btn"
            >
              <Play className="w-5 h-5" />
              <span>{t('home.hero.joinButton')}</span>
            </a>

            <div
              style={{
                backdropFilter: 'blur(16px) saturate(150%)',
                'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
                background: 'var(--theme-surface-glass)',
                padding: '8px 24px',
                borderRadius: '12px',
                border: '1px solid var(--theme-border-glass)',
                color: 'var(--theme-text-muted)',
                fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
              }}
            >
              {t('home.hero.notice')}
            </div>
          </div>
        </div>

        {/* ── Dynamic Client Section: Stats + Announcements ── */}
        <HomeSection />

        {/* ── Features (SSR — 静态文字，无需 JS) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <ScrollReveal direction="left" delay={0.1}>
            <div
              className="glass-card hover-lift"
              style={{ padding: 'clamp(1.5rem, 4vw, 2rem)', cursor: 'pointer' }}
            >
              <div className="flex items-start gap-4 sm:gap-6">
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    backdropFilter: 'blur(16px) saturate(150%)',
                    'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
                    background: 'var(--theme-surface-icon)',
                    border: '1px solid var(--theme-border-glass)',
                    boxShadow:
                      '0 4px 24px var(--theme-shadow-glass), inset 0 1px 0 var(--theme-shadow-glass-inset)',
                    flexShrink: 0,
                  }}
                >
                  <Award className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: '#FFAA00' }} />
                </div>
                <div className="flex-1">
                  <h4
                    style={{
                      fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      color: 'var(--theme-text-heading)',
                      marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
                    }}
                  >
                    {t('home.features.creativeFreedom.title')}
                  </h4>
                  <p
                    style={{
                      color: 'var(--theme-text-muted)',
                      lineHeight: 1.75,
                      fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                    }}
                  >
                    {t('home.features.creativeFreedom.description')}
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={0.1}>
            <div
              className="glass-card hover-lift"
              style={{ padding: 'clamp(1.5rem, 4vw, 2rem)', cursor: 'pointer' }}
            >
              <div className="flex items-start gap-4 sm:gap-6">
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    backdropFilter: 'blur(16px) saturate(150%)',
                    'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
                    background: 'var(--theme-surface-icon)',
                    border: '1px solid var(--theme-border-glass)',
                    boxShadow:
                      '0 4px 24px var(--theme-shadow-glass), inset 0 1px 0 var(--theme-shadow-glass-inset)',
                    flexShrink: 0,
                  }}
                >
                  <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: '#55FF55' }} />
                </div>
                <div className="flex-1">
                  <h4
                    style={{
                      fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      color: 'var(--theme-text-heading)',
                      marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
                    }}
                  >
                    {t('home.features.curatedCommunity.title')}
                  </h4>
                  <p
                    style={{
                      color: 'var(--theme-text-muted)',
                      lineHeight: 1.75,
                      fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                    }}
                  >
                    {t('home.features.curatedCommunity.description')}
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
