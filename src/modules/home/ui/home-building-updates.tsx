'use client';

import { Building2, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { getBuildingPath } from '@/modules/building/lib/building-links';
import { getBuildingName } from '@/modules/building/lib/building-view-helpers';
import type { Building } from '@/modules/building/model/building-types';
import { BuildingPreviewImage } from '@/modules/building/ui/building-preview-image';
import { Link } from '@/shared/i18n/navigation';
import { SkeletonLine } from '@/shared/ui/feedback/async-state';

export function HomeBuildingUpdates({
  buildings: recentBuildings,
  unavailable,
}: {
  buildings: Building[];
  unavailable: boolean;
}) {
  const t = useTranslations('home.playerHome.buildings');
  const mapT = useTranslations('map');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
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
            const name = getBuildingName(building, locale);
            const cover = building.images.find((url) => !imageErrors.includes(url));
            return (
              <Link
                key={building.id}
                href={getBuildingPath(building.id)}
                scroll={false}
                className="home-building-preview"
                aria-label={t('open', { name })}
              >
                <span className="home-building-preview__image">
                  {cover ? (
                    <BuildingPreviewImage
                      building={building}
                      imageIndex={building.images.indexOf(cover)}
                      alt=""
                      sizes="(max-width: 639px) 100vw, (max-width: 900px) 50vw, 33vw"
                      className="object-cover"
                      onError={() => setImageErrors((previous) => [...previous, cover])}
                    />
                  ) : (
                    <Building2 className="h-10 w-10" aria-hidden="true" />
                  )}
                </span>
                <span className="home-building-preview__copy">
                  <strong>{name}</strong>
                  {building.builders.length > 0 ? (
                    <span>{building.builders.map((builder) => builder.name).join(', ')}</span>
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
            <p>{unavailable ? t('unavailable') : t('empty')}</p>
            {unavailable ? (
              <button
                type="button"
                className="home-building-retry"
                disabled={isRefreshing}
                onClick={() => startRefresh(() => router.refresh())}
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
