'use client';

import { Building2, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { getBuildingPath } from '@/modules/building/lib/building-links';
import {
  getPublicBuildingCatalogUrl,
  isLocalizedBuildingCatalogResponse,
  resolveBuildingCatalog,
} from '@/modules/building/model/building-api';
import { prepareBuildingPreview } from '@/modules/building/lib/building-image-preview';
import { BuildingCover } from '@/modules/building/ui/building-cover';
import {
  HOME_BUILDING_LIMIT,
  type HomeBuildingPreview,
  toHomeBuildingPreview,
} from '@/modules/home/model/home-building-preview';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';
import { Link } from '@/shared/i18n/navigation';
import type { AppLocale } from '@/shared/i18n/routing';
import { SkeletonLine } from '@/shared/ui/feedback/async-state';

export function HomeBuildingUpdates({
  buildings: recentBuildings,
  onRetry,
  isRefreshing = false,
}: {
  buildings: HomeBuildingPreview[];
  onRetry?: () => void;
  isRefreshing?: boolean;
}) {
  const t = useTranslations('home.playerHome.buildings');
  const mapT = useTranslations('map');
  const commonT = useTranslations('common');
  const [imageErrors, setImageErrors] = useState<string[]>([]);

  return (
    <section className="home-building-section" aria-labelledby="home-buildings-title">
      <div className="home-section-heading">
        <div>
          <h2 id="home-buildings-title">{t('title')}</h2>
        </div>
        <Link href="/buildings">{t('viewAll')}</Link>
      </div>
      <div
        className={`home-building-grid${recentBuildings.length === 1 ? ' home-building-grid--single' : ''}`}
      >
        <Link href="/map" className="home-world-map">
          <Image
            src="/images/map/world-preview.webp"
            alt=""
            fill
            sizes="(max-width: 639px) 100vw, 45vw"
            className="home-world-map__image"
          />
          <h3>{mapT('title')}</h3>
        </Link>
        {recentBuildings.length > 0 ? (
          recentBuildings.map((building) => {
            const cover = building.images.find(({ webp }) => !imageErrors.includes(webp));
            return (
              <Link
                key={building.id}
                href={getBuildingPath(building.id)}
                onNavigate={() => { if (cover) prepareBuildingPreview(cover); }}
                scroll={false}
                className="home-building-preview"
                aria-label={t('open', { name: building.name })}
              >
                <span className="home-building-preview__image">
                  {cover ? (
                    <BuildingCover
                      key={cover.jxl}
                      image={cover}
                      alt=""
                      onError={() => setImageErrors((previous) => [...previous, cover.webp])}
                    />
                  ) : (
                    <Building2 className="h-10 w-10" aria-hidden="true" />
                  )}
                </span>
                <span className="home-building-preview__copy">
                  <strong>{building.name}</strong>
                  {building.builderNames.length > 0 ? (
                    <span>{building.builderNames.join(', ')}</span>
                  ) : null}
                  <span className="home-building-preview__coordinates">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {building.coordinates.world} · {building.coordinates.x},{' '}
                      {building.coordinates.y}, {building.coordinates.z}
                    </span>
                  </span>
                </span>
              </Link>
            );
          })
        ) : (
          <div className="home-building-empty">
            <p>{onRetry ? t('unavailable') : t('empty')}</p>
            {onRetry ? (
              <button
                type="button"
                className="home-building-retry"
                disabled={isRefreshing}
                onClick={onRetry}
              >
                {isRefreshing ? t('retrying') : commonT('actions.retry')}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

/** Recover a failed server snapshot from the public catalog without re-rendering the page. */
export function HomeBuildingUpdatesRecovery({ locale }: { locale: AppLocale }) {
  const [buildings, setBuildings] = useState<HomeBuildingPreview[] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function retry() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const result = await fetchValidatedJson({
      url: getPublicBuildingCatalogUrl({ locale, limit: HOME_BUILDING_LIMIT }),
      validate: (value) =>
        isLocalizedBuildingCatalogResponse(value, HOME_BUILDING_LIMIT),
      timeoutMs: 15_000,
      cache: 'reload',
      fallbackErrorMessage: 'building_catalog_unavailable',
    });
    if (result.status === 'success') {
      setBuildings(resolveBuildingCatalog(result.data).map(toHomeBuildingPreview));
    }
    setIsRefreshing(false);
  }

  return (
    <HomeBuildingUpdates
      buildings={buildings ?? []}
      onRetry={buildings === null ? retry : undefined}
      isRefreshing={isRefreshing}
    />
  );
}

export function HomeBuildingUpdatesSkeleton() {
  const t = useTranslations('home.playerHome.buildings');
  const commonT = useTranslations('common');
  return (
    <section className="home-building-section" aria-label={t('title')} aria-busy="true">
      <div className="home-section-heading">
        <h2>{t('title')}</h2>
      </div>
      <span className="sr-only" role="status">
        {commonT('states.loading')}
      </span>
      <div className="home-building-grid" aria-hidden="true">
        {['map', 'first', 'second'].map((key) => (
          <div key={key} className="home-building-skeleton">
            <div />
            <SkeletonLine width="60%" />
            <SkeletonLine width="85%" />
          </div>
        ))}
      </div>
    </section>
  );
}
