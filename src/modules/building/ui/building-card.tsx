'use client';

import { Building2 } from 'lucide-react';
import Image from 'next/image';
import type React from 'react';

import { getBuildingImages } from '@/modules/building/lib/building-catalog';
import {
  getBuildingDescription,
  getBuildingName,
  passthroughImageLoader,
} from '@/modules/building/lib/building-view-helpers';
import type { Building, LocalizedText } from '@/modules/building/model/building-types';
import type { BuildingsTranslator } from '@/modules/building/ui/building-metadata';
import {
  BuildingCardFacts,
  BuildingTags,
  BuildingTypeBadge,
} from '@/modules/building/ui/building-metadata';

interface BuildingCardProps {
  building: Building;
  formatDate: (timestamp: number | string) => string;
  getTagKey: (building: Building, tag: LocalizedText) => string;
  isImageError: (imageUrl: string) => boolean;
  locale: string;
  onImageError: (imageUrl: string) => void;
  onOpen: (building: Building) => void;
  t: BuildingsTranslator;
}

export function BuildingCard({
  building,
  formatDate,
  getTagKey,
  isImageError,
  locale,
  onImageError,
  onOpen,
  t,
}: BuildingCardProps) {
  const buildingImages = getBuildingImages(building);
  const coverImage = buildingImages[0];

  return (
    <button
      type="button"
      onClick={() => onOpen(building)}
      className="glass-card group mb-6 w-full cursor-pointer overflow-hidden rounded-2xl text-left transition-all duration-300 hover:scale-[1.02] hover:border-purple-400/30"
      style={{
        WebkitBackdropFilter: 'blur(16px) saturate(150%)',
      }}
    >
      <div className="relative h-56 overflow-hidden bg-linear-to-br from-purple-900/20 to-blue-900/20">
        {coverImage && !isImageError(coverImage) ? (
          <>
            <Image
              loader={passthroughImageLoader}
              src={coverImage}
              alt={getBuildingName(building, locale)}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover"
              unoptimized
              loading="lazy"
              onError={() => onImageError(coverImage)}
            />
            {buildingImages.length > 1 ? (
              <div className="absolute right-3 bottom-3 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 backdrop-blur-md">
                <span className="text-xs font-medium text-white">+{buildingImages.length - 1}</span>
              </div>
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2 className="h-20 w-20" style={{ color: 'var(--theme-text-faint)' }} />
          </div>
        )}
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 backdrop-blur-md"
          style={{
            background: 'var(--theme-surface-badge)',
            border: '1px solid var(--theme-border-glass)',
          }}
        >
          <BuildingTypeBadge buildType={building.buildType} compact t={t} />
        </div>
      </div>

      <div className="p-6">
        <h3
          className="mb-3 text-xl font-bold transition-colors group-hover:text-purple-300"
          style={{ color: 'var(--theme-text-heading)' }}
        >
          {getBuildingName(building, locale)}
        </h3>

        <BuildingTags building={building} getTagKey={getTagKey} locale={locale} compact />

        <p
          className="mb-4 text-sm leading-relaxed whitespace-pre-line"
          style={{
            color: 'var(--theme-text-muted-soft)',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
            overflow: 'hidden',
          }}
        >
          {getBuildingDescription(building, locale)}
        </p>

        <BuildingCardFacts building={building} formatDate={formatDate} locale={locale} t={t} />
      </div>
    </button>
  );
}
