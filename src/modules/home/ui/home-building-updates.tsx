'use client';

import { Building2, MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { getBuildingId, sortBuildings } from '@/modules/building/lib/building-catalog';
import {
  getBuildingName,
  passthroughImageLoader,
} from '@/modules/building/lib/building-view-helpers';
import type { Building, LocalizedText } from '@/modules/building/model/building-types';
import { getLocalizedText } from '@/modules/building/model/building-types';
import { useBuildingDialog } from '@/modules/building/model/use-building-dialog';
import { useBuildings } from '@/modules/building/model/use-buildings';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { Link } from '@/shared/i18n/routing';
import { SkeletonLine } from '@/shared/ui/feedback/async-state';

const BuildingDetailsDialog = dynamic(
  () =>
    import('@/modules/building/ui/building-details-dialog').then(
      (module) => module.BuildingDetailsDialog,
    ),
  { ssr: false },
);

export function HomeBuildingUpdates() {
  const t = useTranslations('home.playerHome.buildings');
  const mapT = useTranslations('home.playerHome.map');
  const buildingsT = useTranslations('buildings');
  const locale = useLocale();
  const mounted = useHasMounted();
  const { buildings, fetchBuildings, error, lastUpdatedAt, isLoading } = useBuildings();
  const dialog = useBuildingDialog();

  useEffect(() => {
    void fetchBuildings();
  }, [fetchBuildings]);

  const recentBuildings = sortBuildings(buildings, 'date-desc', locale).slice(0, 2);
  const isPending = lastUpdatedAt === null && !error;
  const formatDate = (timestamp: number | string) => {
    const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
    return Number.isNaN(date.getTime())
      ? String(timestamp)
      : date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const getTagKey = (building: Building, tag: LocalizedText) =>
    `${getBuildingId(building)}:${getLocalizedText(tag, locale)}`;

  return (
    <section className="home-building-section" aria-labelledby="home-buildings-title">
      <div className="home-section-heading">
        <div>
          <h2 id="home-buildings-title">{t('title')}</h2>
        </div>
        <Link href="/buildings">{t('viewAll')}</Link>
      </div>
      <div
        className={`home-building-grid${!isPending && recentBuildings.length === 1 ? ' home-building-grid--single' : ''}`}
      >
        <Link href="/map" className="home-world-map">
          <Image
            src="/world-map-preview.webp"
            alt=""
            fill
            sizes="(max-width: 639px) 100vw, 45vw"
            className="home-world-map__image"
          />
          <h3>{mapT('title')}</h3>
        </Link>
        {isPending ? (
          ['first', 'second'].map((key) => (
            <div key={key} className="home-building-skeleton" aria-hidden="true">
              <div />
              <SkeletonLine width="60%" />
              <SkeletonLine width="85%" />
            </div>
          ))
        ) : recentBuildings.length > 0 ? (
          recentBuildings.map((building) => {
            const name = getBuildingName(building, locale);
            const cover = building.images.find((url) => !dialog.isImageError(url));
            return (
              <button
                key={getBuildingId(building)}
                type="button"
                className="home-building-preview"
                onClick={() => dialog.open(building)}
                aria-label={t('open', { name })}
                aria-haspopup="dialog"
              >
                <span className="home-building-preview__image">
                  {cover ? (
                    <Image
                      loader={passthroughImageLoader}
                      src={cover}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 639px) 100vw, (max-width: 900px) 50vw, 33vw"
                      className="object-cover"
                      onError={() => dialog.handleImageError(cover)}
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
              </button>
            );
          })
        ) : (
          <div className="home-building-empty">
            <p>{error ? t('unavailable') : t('empty')}</p>
            {error ? (
              <button
                type="button"
                className="home-building-retry"
                disabled={isLoading}
                onClick={() => void fetchBuildings({ force: true })}
              >
                {t(isLoading ? 'retrying' : 'retry')}
              </button>
            ) : null}
          </div>
        )}
      </div>
      {dialog.building ? (
        <BuildingDetailsDialog
          activeImage={dialog.activeImage}
          building={dialog.building}
          currentImageIndex={dialog.imageIndex}
          formatDate={formatDate}
          getTagKey={getTagKey}
          imageLoading={dialog.loading}
          imageTransitionDirection={dialog.direction}
          imageUrls={dialog.images}
          isImageError={dialog.isImageError}
          locale={locale}
          mounted={mounted}
          onClose={dialog.close}
          onImageError={dialog.handleImageError}
          onImageLoad={dialog.handleImageLoad}
          onNextImage={dialog.next}
          onPreviousImage={dialog.prev}
          onSelectImage={dialog.handleSelectImage}
          t={buildingsT}
        />
      ) : null}
    </section>
  );
}
