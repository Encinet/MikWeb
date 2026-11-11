import { BookOpen, MapIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { HomeBuildingUpdatesSkeleton } from '@/modules/home/ui/home-building-updates';
import { HomeBuildingUpdatesSection } from '@/modules/home/ui/home-building-updates-section';
import HomeLiveOverview from '@/modules/home/ui/home-live-overview';
import { HomeWorldNavigation } from '@/modules/home/ui/home-world-navigation';
import { Link } from '@/shared/i18n/navigation';

export default async function HomePage() {
  const homeT = await getTranslations('home');
  const mapT = await getTranslations('map');

  return (
    <div className="home-project-page">
      <section className="home-project-hero">
        <div className="home-project-hero__backdrop" aria-hidden="true" />
        <div className="home-project-container home-project-hero__content">
          <h1>{homeT('hero.title')}</h1>
          <p className="home-project-hero__description">{homeT('hero.description')}</p>
          <nav className="home-project-hero__links" aria-label={homeT('playerHome.tools.title')}>
            <Link className="home-project-button" href="/map">
              <MapIcon className="h-5 w-5" aria-hidden="true" />
              <span>{mapT('title')}</span>
            </Link>
            <Link className="home-project-button home-project-button--secondary" href="/wiki">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <span>{homeT('hero.wikiButton')}</span>
            </Link>
          </nav>
        </div>
      </section>

      <div className="home-project-container home-project-flow">
        <HomeLiveOverview>
          <HomeWorldNavigation />
        </HomeLiveOverview>
        <Suspense fallback={<HomeBuildingUpdatesSkeleton />}>
          <HomeBuildingUpdatesSection />
        </Suspense>
      </div>
    </div>
  );
}
