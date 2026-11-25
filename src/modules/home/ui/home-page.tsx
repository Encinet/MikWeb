import { BookOpen, MapIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { HomeBuildingUpdatesSkeleton } from '@/modules/home/ui/home-building-updates';
import { HomeBuildingUpdatesSection } from '@/modules/home/ui/home-building-updates-section';
import HomeLiveOverview from '@/modules/home/ui/home-live-overview';
import { HomeWorldNavigation } from '@/modules/home/ui/home-world-navigation';
import { PlayerStatusProvider } from '@/modules/player/model/player-status-provider';
import { SITE_NAME } from '@/shared/config/site-config';
import { Link } from '@/shared/i18n/navigation';
import { PageAppearance } from '@/shared/ui/page/page-appearance';

export default async function HomePage() {
  const homeT = await getTranslations('home');
  const mapT = await getTranslations('map');
  const metadataT = await getTranslations('metadata');

  return (
    <div className="home-project-page">
      <PageAppearance appearance="hero" />
      <section className="home-project-hero image-hero">
        <div className="image-hero__backdrop" aria-hidden="true" />
        <div className="home-project-container home-project-hero__content">
          <h1>{SITE_NAME}</h1>
          <p className="home-project-hero__description">{metadataT('description')}</p>
          <nav className="home-project-hero__links" aria-label={homeT('playerHome.tools.title')}>
            <Link className="home-project-button" href="/map">
              <MapIcon className="h-5 w-5" aria-hidden="true" />
              <span>{mapT('title')}</span>
            </Link>
            <Link
              className="home-project-button home-project-button--secondary"
              href="/wiki"
              prefetch
            >
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <span>{homeT('hero.wikiButton')}</span>
            </Link>
          </nav>
        </div>
      </section>

      <div className="home-project-container home-project-flow">
        <PlayerStatusProvider>
          <HomeLiveOverview>
            <HomeWorldNavigation />
          </HomeLiveOverview>
        </PlayerStatusProvider>
        <Suspense fallback={<HomeBuildingUpdatesSkeleton />}>
          <HomeBuildingUpdatesSection />
        </Suspense>
      </div>
    </div>
  );
}
