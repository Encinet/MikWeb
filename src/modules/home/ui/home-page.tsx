import { ArrowRight, BookOpen, Building2, MapIcon, Play, Shield } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import HomeLiveOverview from '@/modules/home/ui/home-live-overview';
import { Link } from '@/shared/i18n/routing';
import ScrollReveal from '@/shared/ui/motion/scroll-reveal';

const APPLY_URL = 'https://mikapply.noctiro.moe';
const MAP_URL = '/map';

export default async function HomePage() {
  const t = await getTranslations();

  const showcaseItems = [
    {
      href: '/buildings',
      icon: Building2,
      key: 'builds',
      title: t('home.showcase.builds.title'),
      description: t('home.showcase.builds.description'),
      className: 'home-project-bento-card--large',
    },
    {
      href: MAP_URL,
      icon: MapIcon,
      key: 'map',
      title: t('home.showcase.map.title'),
      description: t('home.showcase.map.description'),
      className: 'home-project-bento-card--medium home-project-bento-card--image-map',
    },
    {
      href: '/wiki',
      icon: BookOpen,
      key: 'wiki',
      title: t('home.showcase.wiki.title'),
      description: t('home.showcase.wiki.description'),
      className: 'home-project-bento-card--medium home-project-bento-card--image-wiki',
    },
    {
      href: APPLY_URL,
      icon: Play,
      key: 'apply',
      title: t('home.showcase.apply.title'),
      description: t('home.showcase.apply.description'),
      external: true,
      className: 'home-project-bento-card--small home-project-bento-card--tone-green',
    },
    {
      href: '/bans',
      icon: Shield,
      key: 'records',
      title: t('home.showcase.records.title'),
      description: t('home.showcase.records.description'),
      className: 'home-project-bento-card--small home-project-bento-card--tone-brown',
    },
  ];

  return (
    <main className="home-project-page">
      <section className="home-project-hero">
        <div className="home-project-hero__backdrop" aria-hidden="true" />
        <div className="home-project-container home-project-hero__content">
          <p className="home-project-kicker">{t('home.hero.badge')}</p>
          <h1>{t('home.hero.title')}</h1>
          <p className="home-project-hero__description">{t('home.hero.description')}</p>

          <div className="home-project-hero__actions">
            <a href={APPLY_URL} target="_blank" rel="noopener noreferrer" className="home-project-button">
              <Play className="h-5 w-5" />
              <span>{t('home.hero.joinButton')}</span>
            </a>
            <Link href="/wiki" className="home-project-button home-project-button--secondary">
              <BookOpen className="h-5 w-5" />
              <span>{t('home.hero.wikiButton')}</span>
            </Link>
          </div>

          <div className="home-project-hero__server">
            <span>{t('home.hero.notice')}</span>
            <strong>{t('home.hero.serverAddress')}</strong>
          </div>
        </div>
      </section>

      <div className="home-project-container home-project-flow">
        <section className="home-project-section home-project-showcase">
          <div className="home-project-bento-grid">
            {showcaseItems.map((item, index) => {
              const Icon = item.icon;
              const card = (
                <ScrollReveal
                  key={item.key}
                  className="home-project-bento-reveal"
                  direction="up"
                  delay={0.045 * index}
                  style={{ height: '100%' }}
                >
                  <span className={`home-project-bento-card ${item.className}`}>
                    <span className="home-project-bento-card__shade" aria-hidden="true" />
                    <span className="home-project-bento-card__content">
                      <span className="home-project-bento-card__icon">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="home-project-bento-card__copy">
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </span>
                    </span>
                    <ArrowRight className="home-project-bento-card__arrow h-5 w-5" />
                  </span>
                </ScrollReveal>
              );

              if (item.external) {
                return (
                  <a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer">
                    {card}
                  </a>
                );
              }

              return (
                <Link key={item.key} href={item.href}>
                  {card}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="home-project-section home-project-live">
          <HomeLiveOverview />
        </section>
      </div>
    </main>
  );
}
