'use client';

import { Building2, MapPin, UserRound } from 'lucide-react';
import Image from 'next/image';

import { getBuildingImages } from '@/modules/building/lib/building-catalog';
import {
  getBuildingName,
  passthroughImageLoader,
} from '@/modules/building/lib/building-view-helpers';
import type { Building } from '@/modules/building/model/building-types';
import type { BuildingsTranslator } from '@/modules/building/ui/building-metadata';
import { BuilderNames, BuildingTypeBadge } from '@/modules/building/ui/building-metadata';

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
  const buildingImages = getBuildingImages(building);
  const coverImage = buildingImages.find((imageUrl) => !isImageError(imageUrl));
  const buildingName = getBuildingName(building, locale);

  const maxVisibleDots = 4;
  const dotImages = buildingImages.slice(0, maxVisibleDots);

  return (
    <button type="button" onClick={() => onOpen(building)} className="building-archive-card">
      <div className="building-archive-card__media">
        {coverImage ? (
          <Image
            loader={passthroughImageLoader}
            src={coverImage}
            alt={buildingName}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
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

        {/* Type — corner badge */}
        <span
          className={`building-archive-card__type-badge building-archive-card__type-badge--${building.buildType}`}
        >
          <BuildingTypeBadge buildType={building.buildType} compact t={t} />
        </span>

        {/* Image count — dot indicator */}
        {buildingImages.length > 1 ? (
          <span className="building-archive-card__dot-indicator" aria-hidden="true">
            {dotImages.map((imageUrl, index) => (
              <span key={imageUrl} className={index === 0 ? 'is-active' : ''} />
            ))}
            {buildingImages.length > maxVisibleDots ? (
              <span
                style={{
                  background: 'transparent',
                  boxShadow: 'none',
                  color: 'rgba(255,250,240,0.55)',
                  fontSize: '8px',
                  lineHeight: '5px',
                  fontWeight: 700,
                }}
              >
                +{buildingImages.length - maxVisibleDots + 1}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      {/* Info band — always visible */}
      <div className="building-archive-card__info">
        <h3>{buildingName}</h3>
        <span className="coords">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {building.coordinates.x}, {building.coordinates.y}, {building.coordinates.z}
        </span>
        <span className="builders">
          <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
          <BuilderNames builders={building.builders} compact />
        </span>
      </div>
    </button>
  );
}
