'use client';

import { Building2, Images, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useState, ViewTransition } from 'react';
import { getBuildingPath, getBuildingPreviewUrl } from '@/modules/building/lib/building-links';
import { getBuildingName } from '@/modules/building/lib/building-view-helpers';
import type { Building } from '@/modules/building/model/building-types';
import type { BuildingsTranslator } from '@/modules/building/ui/building-metadata';
import { BuilderSummary } from '@/modules/building/ui/building-metadata';
import { Link } from '@/shared/i18n/navigation';

interface BuildingCardProps {
  building: Building;
  locale: string;
  t: BuildingsTranslator;
  prioritizeCover?: boolean;
}

export function BuildingCard({ building, locale, t, prioritizeCover = false }: BuildingCardProps) {
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const [prefetch, setPrefetch] = useState(false);
  const buildingImages = building.images;
  const coverImage = buildingImages.find((imageUrl) => !imageErrors.includes(imageUrl));
  const buildingName = getBuildingName(building, locale);

  return (
    <ViewTransition
      name={`building-card-${building.id}`}
      default="none"
      enter={{ 'building-catalog': 'building-card-enter', default: 'none' }}
      exit={{ 'building-catalog': 'building-card-exit', default: 'none' }}
      update={{ 'building-catalog': 'building-card-move', default: 'none' }}
      share={{ 'building-catalog': 'building-card-move', default: 'none' }}
    >
      <article className="building-archive-card">
        <Link
          href={getBuildingPath(building.id)}
          prefetch={prefetch ? 'auto' : false}
          onMouseEnter={() => setPrefetch(true)}
          onFocus={() => setPrefetch(true)}
          onTouchStart={() => setPrefetch(true)}
          scroll={false}
          transitionTypes={['building-open']}
          className="building-archive-card__link"
        >
          <div className="building-archive-card__media">
            {coverImage ? (
              <Image
                src={getBuildingPreviewUrl(coverImage, 640)}
                fill
                unoptimized
                alt={buildingName}
                className="object-cover"
                loading={prioritizeCover ? 'eager' : 'lazy'}
                fetchPriority={prioritizeCover ? 'high' : 'auto'}
                onError={() => setImageErrors((previous) => [...previous, coverImage])}
              />
            ) : (
              <div className="building-archive-card__fallback">
                <Building2 className="h-14 w-14" aria-hidden="true" />
              </div>
            )}

            {buildingImages.length > 1 ? (
              <span className="building-archive-card__image-count">
                <Images className="h-3.5 w-3.5" aria-hidden="true" />
                <span aria-hidden="true">{buildingImages.length}</span>
                <span className="sr-only">
                  {t('imagesCount', { count: buildingImages.length })}
                </span>
              </span>
            ) : null}
          </div>

          {/* Info band — always visible */}
          <div className="building-archive-card__info">
            <div className="building-archive-card__heading">
              <h2>{buildingName}</h2>
              <span className="building-archive-card__type">
                {t(`types.${building.buildType}`)}
              </span>
            </div>
            <span className="coords">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {building.coordinates.world} · {building.coordinates.x}, {building.coordinates.y},{' '}
                {building.coordinates.z}
              </span>
            </span>
            <span className="builders">
              <BuilderSummary builders={building.builders} compact />
            </span>
          </div>
        </Link>
      </article>
    </ViewTransition>
  );
}
