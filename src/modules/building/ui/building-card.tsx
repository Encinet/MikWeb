'use client';

import { Building2, Images, MapPin } from 'lucide-react';
import Image from 'next/image';

import { getBuildingName } from '@/modules/building/lib/building-view-helpers';
import type { Building } from '@/modules/building/model/building-types';
import type { BuildingsTranslator } from '@/modules/building/ui/building-metadata';
import { BuilderSummary } from '@/modules/building/ui/building-metadata';

interface BuildingCardProps {
  building: Building;
  isImageError: (imageUrl: string) => boolean;
  locale: string;
  onImageError: (imageUrl: string) => void;
  onOpen: (building: Building) => void;
  t: BuildingsTranslator;
}

export function BuildingCard({
  building,
  isImageError,
  locale,
  onImageError,
  onOpen,
  t,
}: BuildingCardProps) {
  const buildingImages = building.images;
  const coverImage = buildingImages.find((imageUrl) => !isImageError(imageUrl));
  const buildingName = getBuildingName(building, locale);

  return (
    <button type="button" onClick={() => onOpen(building)} className="building-archive-card">
      <div className="building-archive-card__media">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={buildingName}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1392px) 25vw, 320px"
            className="object-cover"
            unoptimized
            loading="lazy"
            onError={() => onImageError(coverImage)}
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
            <span className="sr-only">{t('imagesCount', { count: buildingImages.length })}</span>
          </span>
        ) : null}
      </div>

      {/* Info band — always visible */}
      <div className="building-archive-card__info">
        <div className="building-archive-card__heading">
          <h2>{buildingName}</h2>
          <span className="building-archive-card__type">{t(`types.${building.buildType}`)}</span>
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
    </button>
  );
}
