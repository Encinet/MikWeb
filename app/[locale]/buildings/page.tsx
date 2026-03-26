'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Building2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  MapPin,
  Search,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import Masonry from 'react-masonry-css';

import ScrollReveal from '@/components/ScrollReveal';
import { useBuildingsContext } from '@/contexts/BuildingsContext';
import { useHasMounted } from '@/hooks/useHasMounted';
import type { BuildingFilterId, BuildingSortKey } from '@/lib/buildings';
import {
  BUILDING_MASONRY_BREAKPOINT_COLUMNS,
  BUILDINGS_PAGE_SIZE,
  filterBuildings,
  getBuildingId,
  getBuildingImages,
  isBuildingSortKey,
  sortBuildings,
} from '@/lib/buildings';
import type { Building, LocalizedText } from '@/lib/types';
import { getLocalizedText, sortBuildersByWeight } from '@/lib/types';

function getBuildingName(building: Building, locale: string): string {
  return getLocalizedText(building.name, locale);
}

function getBuildingDescription(building: Building, locale: string): string {
  return getLocalizedText(building.description, locale);
}

function getBuildingSourceNotes(building: Building, locale: string): string {
  return getLocalizedText(building.source?.notes, locale);
}

function passthroughImageLoader({ src }: { src: string }): string {
  return src;
}

type BuildingsTranslator = ReturnType<typeof useTranslations<'buildings'>>;

interface BuildingTypeBadgeProps {
  buildType: Building['buildType'];
  t: BuildingsTranslator;
  compact?: boolean;
}

function BuildingTypeBadge({ buildType, t, compact = false }: BuildingTypeBadgeProps) {
  const iconClassName = compact ? 'w-4 h-4' : 'w-4 h-4';
  const textClassName = compact ? 'text-xs font-medium' : 'text-sm font-medium';

  if (buildType === 'original') {
    return (
      <>
        <CheckCircle className={`${iconClassName} text-green-400`} />
        <span className={`${textClassName} text-green-400`}>{t('labels.original')}</span>
      </>
    );
  }

  if (buildType === 'derivative') {
    return (
      <>
        <Copy className={iconClassName} style={{ color: 'var(--blue-accent)' }} />
        <span className={textClassName} style={{ color: 'var(--blue-accent)' }}>
          {t('labels.derivative')}
        </span>
      </>
    );
  }

  return (
    <>
      <Copy className={`${iconClassName} text-amber-400`} />
      <span className={`${textClassName} text-amber-400`}>{t('labels.replica')}</span>
    </>
  );
}

interface BuildingTagsProps {
  building: Building;
  getTagKey: (building: Building, tag: LocalizedText) => string;
  locale: string;
  compact?: boolean;
}

function BuildingTags({ building, getTagKey, locale, compact = false }: BuildingTagsProps) {
  if (!building.tags || building.tags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'mb-3' : ''}`}>
      {building.tags.map((tag) => (
        <span
          key={getTagKey(building, tag)}
          className={
            compact
              ? 'px-2.5 py-1 text-xs font-medium rounded-full backdrop-blur-md'
              : 'px-3 py-1.5 text-sm font-medium rounded-full backdrop-blur-md'
          }
          style={{
            background: 'var(--tag-bg)',
            color: 'var(--tag-text)',
            border: '1px solid var(--tag-border)',
          }}
        >
          {getLocalizedText(tag, locale)}
        </span>
      ))}
    </div>
  );
}

interface BuilderNamesProps {
  builders: Building['builders'];
  compact?: boolean;
}

function BuilderNames({ builders, compact = false }: BuilderNamesProps) {
  const sortedBuilders = sortBuildersByWeight(builders);
  const maxWeight = sortedBuilders[0]?.weight || 100;

  return sortedBuilders.map((builder, index) => {
    const isMainContributor = builder.weight === maxWeight;
    const contributionLevel = builder.weight / maxWeight;

    return (
      <span
        key={builder.uuid}
        className="text-green-400 transition-all"
        style={{
          fontWeight: isMainContributor ? 600 : 500,
          fontSize: compact
            ? isMainContributor
              ? '0.875rem'
              : '0.8125rem'
            : isMainContributor
              ? '1rem'
              : '0.875rem',
          opacity: 0.5 + contributionLevel * 0.5,
        }}
      >
        {builder.name}
        {index < builders.length - 1 && ','}
      </span>
    );
  });
}

interface BuildingSourceDetailsProps {
  building: Building;
  locale: string;
  t: BuildingsTranslator;
  compact?: boolean;
}

function BuildingSourceDetails({
  building,
  locale,
  t,
  compact = false,
}: BuildingSourceDetailsProps) {
  if (!building.source) {
    return null;
  }

  if (compact) {
    return (
      <>
        {building.source.originalAuthor && (
          <div
            className="flex items-start gap-2 text-sm pt-2 border-t"
            style={{
              borderColor: 'var(--glass-border-light)',
            }}
          >
            <User className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--purple-accent)' }} />
            <div className="flex-1 min-w-0">
              <span style={{ color: 'var(--text-muted)' }}>{t('labels.originalAuthor')}</span>
              <p className="font-medium" style={{ color: 'var(--purple-accent)' }}>
                {building.source.originalAuthor}
              </p>
            </div>
          </div>
        )}
        {building.source.originalLink && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--purple-accent)' }} />
            <div className="flex-1 min-w-0">
              <span style={{ color: 'var(--text-muted)' }}>{t('labels.source')}</span>
              <a
                href={building.source.originalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="underline block truncate"
                style={{ color: 'var(--purple-accent)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {building.source.originalLink}
              </a>
            </div>
          </div>
        )}
        {building.source.notes && (
          <div className="text-xs italic pt-1" style={{ color: 'var(--text-muted)' }}>
            {getBuildingSourceNotes(building, locale)}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="pt-4 border-t space-y-4" style={{ borderColor: 'var(--glass-border-light)' }}>
      {building.source.originalAuthor && (
        <div className="flex items-start gap-3">
          <User className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--purple-accent)' }} />
          <div className="flex-1">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('labels.originalAuthor')}
            </span>
            <p className="font-medium mt-1" style={{ color: 'var(--purple-accent)' }}>
              {building.source.originalAuthor}
            </p>
          </div>
        </div>
      )}
      {building.source.originalLink && (
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--purple-accent)' }} />
          <div className="flex-1 min-w-0">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('labels.source')}
            </span>
            <a
              href={building.source.originalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="underline block truncate mt-1"
              style={{ color: 'var(--purple-accent)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {building.source.originalLink}
            </a>
          </div>
        </div>
      )}
      {building.source.notes && (
        <div className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
          {getBuildingSourceNotes(building, locale)}
        </div>
      )}
    </div>
  );
}

interface BuildingCardFactsProps {
  building: Building;
  formatDate: (timestamp: number | string) => string;
  locale: string;
  t: BuildingsTranslator;
}

function BuildingCardFacts({ building, formatDate, locale, t }: BuildingCardFactsProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
        <span style={{ color: 'var(--text-muted)' }}>{t('labels.coordinates')}</span>
        <code
          style={{ background: 'var(--code-bg)' }}
          className="text-amber-400 font-mono px-2 py-1 rounded text-xs"
        >
          {building.coordinates.x}, {building.coordinates.y}, {building.coordinates.z}
        </code>
      </div>

      <div className="flex items-start gap-2 text-sm">
        <User className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span style={{ color: 'var(--text-muted)' }}>
            {building.builders.length > 1 ? t('labels.builders') : t('labels.builder')}
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <BuilderNames builders={building.builders} compact />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Bell className="w-4 h-4 shrink-0" style={{ color: 'var(--blue-accent)' }} />
        <span style={{ color: 'var(--text-muted)' }}>{t('labels.buildDate')}</span>
        <span style={{ color: 'var(--blue-accent)' }}>{formatDate(building.buildDate)}</span>
      </div>

      <BuildingSourceDetails building={building} locale={locale} t={t} compact />
    </div>
  );
}

interface BuildingDetailFactsProps {
  building: Building;
  formatDate: (timestamp: number | string) => string;
  locale: string;
  t: BuildingsTranslator;
}

function BuildingDetailFacts({ building, formatDate, locale, t }: BuildingDetailFactsProps) {
  return (
    <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--glass-border-light)' }}>
      <div className="flex items-start gap-3">
        <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('labels.coordinates')}
          </span>
          <div className="mt-1">
            <code
              style={{ background: 'var(--code-bg)' }}
              className="text-amber-400 font-mono px-3 py-1.5 rounded text-sm"
            >
              {building.coordinates.x}, {building.coordinates.y}, {building.coordinates.z}
            </code>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <User className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {building.builders.length > 1 ? t('labels.builders') : t('labels.builder')}
          </span>
          <div className="flex flex-wrap gap-2 mt-1">
            <BuilderNames builders={building.builders} />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--blue-accent)' }} />
        <div className="flex-1">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('labels.buildDate')}
          </span>
          <div className="mt-1">
            <span className="text-base" style={{ color: 'var(--blue-accent)' }}>
              {formatDate(building.buildDate)}
            </span>
          </div>
        </div>
      </div>

      <BuildingSourceDetails building={building} locale={locale} t={t} />
    </div>
  );
}

interface BuildingDetailGalleryProps {
  activeImage: string | undefined;
  buildingName: string;
  currentImageIndex: number;
  imageLoading: boolean;
  imageUrls: string[];
  isImageError: (imageUrl: string) => boolean;
  onImageError: (imageUrl: string) => void;
  onImageLoad: () => void;
  onNextImage: () => void;
  onPreviousImage: () => void;
  onSelectImage: (imageIndex: number, imageUrls: string[]) => void;
  transitionDirection: -1 | 1;
}

function BuildingDetailGallery({
  activeImage,
  buildingName,
  currentImageIndex,
  imageLoading,
  imageUrls,
  isImageError,
  onImageError,
  onImageLoad,
  onNextImage,
  onPreviousImage,
  onSelectImage,
  transitionDirection,
}: BuildingDetailGalleryProps) {
  return (
    <div
      className="relative w-full md:w-3/5 h-64 md:h-full flex items-center justify-center overflow-hidden"
      style={{
        background: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(8px)',
        'WebkitBackdropFilter': 'blur(8px)',
      }}
    >
      {activeImage && !isImageError(activeImage) ? (
        <>
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-5">
              <div className="flex flex-col items-center gap-4">
                <Building2
                  className="w-24 h-24 animate-pulse"
                  style={{ color: 'var(--text-very-dimmed)' }}
                />
                <div className="flex gap-2">
                  <div
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      background: 'var(--purple-accent)',
                      animationDelay: '0ms',
                    }}
                  />
                  <div
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      background: 'var(--purple-accent)',
                      animationDelay: '150ms',
                    }}
                  />
                  <div
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      background: 'var(--purple-accent)',
                      animationDelay: '300ms',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <AnimatePresence initial={false} custom={transitionDirection} mode="wait">
            <motion.div
              key={activeImage}
              custom={transitionDirection}
              initial={{
                opacity: 0,
                x: transitionDirection * 56,
              }}
              animate={{
                opacity: imageLoading ? 0.25 : 1,
                x: 0,
              }}
              exit={{
                opacity: 0,
                x: transitionDirection * -56,
              }}
              transition={{
                duration: imageLoading ? 0.14 : 0.26,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute inset-0"
              style={{
                willChange: 'transform, opacity',
              }}
            >
              <Image
                loader={passthroughImageLoader}
                src={activeImage}
                alt={buildingName}
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                className="object-contain"
                unoptimized
                loading="lazy"
                onLoad={onImageLoad}
                onError={() => onImageError(activeImage)}
              />
            </motion.div>
          </AnimatePresence>

          {imageUrls.length > 1 && (
            <>
              <button
                type="button"
                onClick={onPreviousImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all duration-200 z-10"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(12px)',
                  'WebkitBackdropFilter': 'blur(12px)',
                  border: '1px solid var(--glass-border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--glass-bg)';
                }}
              >
                <ChevronLeft className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
              </button>

              <button
                type="button"
                onClick={onNextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all duration-200 z-10"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(12px)',
                  'WebkitBackdropFilter': 'blur(12px)',
                  border: '1px solid var(--glass-border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--glass-bg)';
                }}
              >
                <ChevronRight className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
              </button>

              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 rounded-full"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(12px)',
                  'WebkitBackdropFilter': 'blur(12px)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {imageUrls.map((imageUrl, index) => (
                  <button
                    type="button"
                    key={imageUrl}
                    onClick={() => onSelectImage(index, imageUrls)}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: index === currentImageIndex ? '32px' : '8px',
                      height: '8px',
                      background:
                        index === currentImageIndex
                          ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)'
                          : 'rgba(255, 255, 255, 0.3)',
                    }}
                    onMouseEnter={(e) => {
                      if (index !== currentImageIndex) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (index !== currentImageIndex) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                      }
                    }}
                  ></button>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <Building2 className="w-32 h-32" style={{ color: 'var(--text-very-dimmed)' }} />
      )}
    </div>
  );
}

interface BuildingDetailInfoProps {
  building: Building;
  formatDate: (timestamp: number | string) => string;
  getTagKey: (building: Building, tag: LocalizedText) => string;
  locale: string;
  t: ReturnType<typeof useTranslations<'buildings'>>;
}

function BuildingDetailInfo({
  building,
  formatDate,
  getTagKey,
  locale,
  t,
}: BuildingDetailInfoProps) {
  return (
    <div
      className="w-full md:w-2/5 h-full overflow-y-auto p-6 sm:p-8"
      style={{
        background: 'rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="space-y-6">
        <div>
          <h2
            className="text-3xl sm:text-4xl font-bold mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {getBuildingName(building, locale)}
          </h2>

          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 backdrop-blur-md rounded-full"
            style={{
              background: 'var(--badge-modal-bg)',
              border: '1px solid var(--badge-modal-border)',
              color: 'var(--badge-modal-text)',
            }}
          >
            <BuildingTypeBadge buildType={building.buildType} t={t} />
          </div>
        </div>

        <BuildingTags building={building} getTagKey={getTagKey} locale={locale} />

        <p
          className="text-base leading-relaxed whitespace-pre-line"
          style={{ color: 'var(--text-muted-light)' }}
        >
          {getBuildingDescription(building, locale)}
        </p>

        <BuildingDetailFacts building={building} formatDate={formatDate} locale={locale} t={t} />
      </div>
    </div>
  );
}

interface BuildingsToolbarProps {
  activeFilter: BuildingFilterId;
  filterOptions: { id: BuildingFilterId; label: string }[];
  onFilterChange: (filterId: BuildingFilterId) => void;
  onSearchQueryChange: (searchQuery: string) => void;
  onSortChange: (sortKey: BuildingSortKey) => void;
  searchPlaceholder: string;
  searchQuery: string;
  sortBy: BuildingSortKey;
  sortOptions: { id: BuildingSortKey; label: string }[];
}

function BuildingsToolbar({
  activeFilter,
  filterOptions,
  onFilterChange,
  onSearchQueryChange,
  onSortChange,
  searchPlaceholder,
  searchQuery,
  sortBy,
  sortOptions,
}: BuildingsToolbarProps) {
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="flex-1 relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 z-10 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg backdrop-blur-md focus:border-purple-400/50 focus:outline-none transition-all relative z-0"
            style={{
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
            }}
          />
        </div>

        <div className="relative sm:w-64">
          <SlidersHorizontal
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 z-10 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <select
            value={sortBy}
            onChange={(event) => {
              if (isBuildingSortKey(event.target.value)) {
                onSortChange(event.target.value);
              }
            }}
            className="w-full pl-12 pr-10 py-3 rounded-lg backdrop-blur-md focus:border-purple-400/50 focus:outline-none transition-all appearance-none cursor-pointer relative z-0"
            style={{
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            {sortOptions.map((sortOption) => (
              <option key={sortOption.id} value={sortOption.id}>
                {sortOption.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-12 px-2">
        {filterOptions.map((filterOption) => (
          <button
            type="button"
            key={filterOption.id}
            onClick={() => onFilterChange(filterOption.id)}
            className="px-4 sm:px-6 py-2.5 rounded-lg backdrop-blur-md transition-all duration-300 text-xs sm:text-sm font-medium"
            style={{
              color:
                activeFilter === filterOption.id
                  ? 'var(--filter-active-text)'
                  : 'var(--text-muted-light)',
              background:
                activeFilter === filterOption.id ? 'var(--filter-active-bg)' : 'var(--glass-bg)',
              border:
                activeFilter === filterOption.id
                  ? '1px solid var(--filter-active-border)'
                  : '1px solid var(--glass-border)',
              boxShadow:
                activeFilter === filterOption.id
                  ? '0 10px 15px -3px var(--filter-active-shadow)'
                  : 'none',
              transform: activeFilter === filterOption.id ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {filterOption.label}
          </button>
        ))}
      </div>
    </>
  );
}

function BuildingsLoadingState({ message }: { message: string }) {
  return (
    <div className="text-center py-20">
      <div
        className="inline-block w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--purple-accent)', borderTopColor: 'transparent' }}
      />
      <p className="mt-6 text-lg" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
    </div>
  );
}

interface BuildingsMessageStateProps {
  description: string;
  iconColor: string;
  title?: string;
}

function BuildingsMessageState({ description, iconColor, title }: BuildingsMessageStateProps) {
  return (
    <div className="text-center py-20">
      <Building2 className="w-16 h-16 mx-auto mb-4" style={{ color: iconColor }} />
      {title && (
        <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
          {title}
        </p>
      )}
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {description}
      </p>
    </div>
  );
}

interface BuildingCardProps {
  building: Building;
  delay: number;
  formatDate: (timestamp: number | string) => string;
  getTagKey: (building: Building, tag: LocalizedText) => string;
  isImageError: (imageUrl: string) => boolean;
  locale: string;
  onImageError: (imageUrl: string) => void;
  onOpen: (building: Building, event: React.MouseEvent<HTMLButtonElement>) => void;
  t: BuildingsTranslator;
}

function BuildingCard({
  building,
  delay,
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
    <ScrollReveal key={getBuildingId(building)} delay={delay} direction="up">
      <button
        type="button"
        onClick={(event) => onOpen(building, event)}
        className="w-full rounded-2xl hover:border-purple-400/30 transition-all duration-300 overflow-hidden group cursor-pointer hover:scale-[1.02] mb-6 text-left"
        style={{
          backdropFilter: 'blur(16px) saturate(150%)',
          'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div className="relative h-56 bg-linear-to-br from-purple-900/20 to-blue-900/20 overflow-hidden">
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
              {buildingImages.length > 1 && (
                <div className="absolute bottom-3 right-3 px-2.5 py-1 backdrop-blur-md bg-black/50 rounded-full border border-white/20">
                  <span className="text-xs text-white font-medium">
                    +{buildingImages.length - 1}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-20 h-20" style={{ color: 'var(--text-very-dimmed)' }} />
            </div>
          )}
          <div
            className="absolute top-3 right-3 px-3 py-1.5 backdrop-blur-md rounded-full flex items-center gap-1.5"
            style={{
              background: 'var(--badge-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <BuildingTypeBadge buildType={building.buildType} t={t} compact />
          </div>
        </div>

        <div className="p-6">
          <h3
            className="text-xl font-bold mb-3 group-hover:text-purple-300 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            {getBuildingName(building, locale)}
          </h3>

          <BuildingTags building={building} getTagKey={getTagKey} locale={locale} compact />

          <p
            className="text-sm leading-relaxed mb-4 whitespace-pre-line"
            style={{
              color: 'var(--text-muted-light)',
              display: '-webkit-box',
              'WebkitLineClamp': 3,
              'WebkitBoxOrient': 'vertical' as React.CSSProperties['WebkitBoxOrient'],
              overflow: 'hidden',
            }}
          >
            {getBuildingDescription(building, locale)}
          </p>

          <BuildingCardFacts building={building} formatDate={formatDate} locale={locale} t={t} />
        </div>
      </button>
    </ScrollReveal>
  );
}

export default function BuildingsPage() {
  const t = useTranslations('buildings');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const { buildings, isLoading, error, fetchBuildings } = useBuildingsContext();
  const [buildingFilter, setBuildingFilter] = useState<BuildingFilterId>('all');
  const [displayedCount, setDisplayedCount] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<BuildingSortKey>('random');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageTransitionDirection, setImageTransitionDirection] = useState<-1 | 1>(1);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);

  const mounted = useHasMounted();
  const selectedBuildingImages = useMemo(() => {
    return selectedBuilding ? getBuildingImages(selectedBuilding) : [];
  }, [selectedBuilding]);
  const activeSelectedImage = selectedBuildingImages[currentImageIndex];

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  useEffect(() => {
    if (selectedBuilding) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedBuilding]);

  const formatDate = (timestamp: number | string) => {
    const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const filteredBuildings = useMemo(() => {
    return sortBuildings(
      filterBuildings(buildings, buildingFilter, searchQuery, locale),
      sortBy,
      locale,
    );
  }, [buildings, buildingFilter, searchQuery, sortBy, locale]);

  const displayedBuildings = filteredBuildings.slice(0, displayedCount);
  const hasMore = displayedCount < filteredBuildings.length;

  const loadMore = () => {
    setDisplayedCount((previousCount) =>
      Math.min(previousCount + BUILDINGS_PAGE_SIZE, filteredBuildings.length),
    );
  };

  const handleFilterChange = (filterId: BuildingFilterId) => {
    setBuildingFilter(filterId);
    setDisplayedCount(BUILDINGS_PAGE_SIZE);
  };

  const handleSearchQueryChange = (nextSearchQuery: string) => {
    setSearchQuery(nextSearchQuery);
    setDisplayedCount(BUILDINGS_PAGE_SIZE);
  };

  const handleSortChange = (nextSortKey: BuildingSortKey) => {
    setSortBy(nextSortKey);
    setDisplayedCount(BUILDINGS_PAGE_SIZE);
  };

  const filterOptions: { id: BuildingFilterId; label: string }[] = [
    { id: 'all', label: t('filters.all') },
    { id: 'original', label: t('filters.original') },
    { id: 'derivative', label: t('filters.derivative') },
    { id: 'replica', label: t('filters.replica') },
  ];

  const sortOptions: { id: BuildingSortKey; label: string }[] = [
    { id: 'date-desc', label: t('sort.dateDesc') },
    { id: 'date-asc', label: t('sort.dateAsc') },
    { id: 'name-asc', label: t('sort.nameAsc') },
    { id: 'name-desc', label: t('sort.nameDesc') },
    { id: 'random', label: t('sort.random') },
  ];

  const getTagKey = (building: Building, tag: LocalizedText) => {
    return `${building.buildDate}-${getLocalizedText(tag, locale)}`;
  };

  const handleImageError = (imageUrl: string) => {
    setImageErrors((prev) => new Set(prev).add(imageUrl));
  };

  const isImageError = (imageUrl: string) => {
    return imageErrors.has(imageUrl);
  };

  const setActiveImageIndex = (
    imageIndex: number,
    imageUrls: string[],
    direction: -1 | 1 = imageIndex >= currentImageIndex ? 1 : -1,
  ) => {
    const nextImageUrl = imageUrls[imageIndex];
    const image = new globalThis.Image();
    image.src = nextImageUrl;

    if (!image.complete) {
      setImageLoading(true);
    }

    setImageTransitionDirection(direction);
    setCurrentImageIndex(imageIndex);
  };

  const openBuildingDetail = (building: Building, event: React.MouseEvent<HTMLButtonElement>) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    setCardRect(rect);
    setSelectedBuilding(building);
    setImageTransitionDirection(1);
    setCurrentImageIndex(0);
  };

  const closeBuildingDetail = () => {
    setSelectedBuilding(null);
    setImageTransitionDirection(1);
    setCurrentImageIndex(0);
    // 延迟清除卡片位置，让退出动画完成
    setTimeout(() => setCardRect(null), 300);
  };

  const nextImage = () => {
    if (selectedBuilding) {
      const nextIndex = (currentImageIndex + 1) % selectedBuildingImages.length;
      setActiveImageIndex(nextIndex, selectedBuildingImages, 1);
    }
  };

  const prevImage = () => {
    if (selectedBuilding) {
      const previousIndex =
        (currentImageIndex - 1 + selectedBuildingImages.length) % selectedBuildingImages.length;
      setActiveImageIndex(previousIndex, selectedBuildingImages, -1);
    }
  };

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 animate-fadeIn">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-linear-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm border border-purple-400/30 shadow-lg">
              <Building2 className="w-8 h-8" style={{ color: 'var(--purple-accent)' }} />
            </div>
            <h1
              className="text-4xl sm:text-5xl font-bold"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('title')}
            </h1>
          </div>
          <p
            className="text-base sm:text-lg max-w-2xl mx-auto"
            style={{ color: 'var(--text-muted-light)' }}
          >
            {t('description')}
          </p>
        </div>

        <BuildingsToolbar
          activeFilter={buildingFilter}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onSearchQueryChange={handleSearchQueryChange}
          onSortChange={handleSortChange}
          searchPlaceholder={t('search')}
          searchQuery={searchQuery}
          sortBy={sortBy}
          sortOptions={sortOptions}
        />

        {isLoading ? (
          <BuildingsLoadingState message={t('loading')} />
        ) : error ? (
          <BuildingsMessageState
            description={error}
            iconColor="var(--purple-accent)"
            title={commonT('error')}
          />
        ) : filteredBuildings.length === 0 ? (
          <BuildingsMessageState description={t('empty')} iconColor="var(--text-very-dimmed)" />
        ) : (
          <InfiniteScroll
            dataLength={displayedBuildings.length}
            next={loadMore}
            hasMore={hasMore}
            loader={
              <div className="text-center py-8">
                <div
                  className="inline-block w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--purple-accent)', borderTopColor: 'transparent' }}
                ></div>
              </div>
            }
            endMessage={
              <div className="text-center py-8">
                <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                  {t('noMore')}
                </p>
              </div>
            }
            style={{ overflow: 'visible' }}
            className="infinite-scroll-component"
          >
            <Masonry
              breakpointCols={BUILDING_MASONRY_BREAKPOINT_COLUMNS}
              className="flex -ml-6 w-auto"
              columnClassName="pl-6 bg-clip-padding"
            >
              {displayedBuildings.map((building, index) => (
                <BuildingCard
                  key={getBuildingId(building)}
                  building={building}
                  delay={index * 0.05}
                  formatDate={formatDate}
                  getTagKey={getTagKey}
                  isImageError={isImageError}
                  locale={locale}
                  onImageError={handleImageError}
                  onOpen={openBuildingDetail}
                  t={t}
                />
              ))}
            </Masonry>
          </InfiniteScroll>
        )}
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {selectedBuilding && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8"
                style={{
                  zIndex: 9999,
                  background: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(32px) saturate(180%)',
                  'WebkitBackdropFilter': 'blur(32px) saturate(180%)',
                }}
                onClick={closeBuildingDetail}
              >
                <motion.div
                  initial={
                    cardRect
                      ? {
                          opacity: 0,
                          scale: Math.min(
                            cardRect.width / 1400,
                            cardRect.height / (window.innerHeight * 0.9),
                          ),
                          x: cardRect.left + cardRect.width / 2 - window.innerWidth / 2,
                          y: cardRect.top + cardRect.height / 2 - window.innerHeight / 2,
                        }
                      : { opacity: 0, scale: 0.95, y: 20 }
                  }
                  animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                  exit={
                    cardRect
                      ? {
                          opacity: 0,
                          scale: Math.min(
                            cardRect.width / 1400,
                            cardRect.height / (window.innerHeight * 0.9),
                          ),
                          x: cardRect.left + cardRect.width / 2 - window.innerWidth / 2,
                          y: cardRect.top + cardRect.height / 2 - window.innerHeight / 2,
                        }
                      : { opacity: 0, scale: 0.95, y: 20 }
                  }
                  transition={{
                    duration: 0.4,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                  className="relative w-full max-w-7xl h-[90vh] flex flex-col md:flex-row gap-0 rounded-3xl overflow-hidden shadow-2xl"
                  style={{
                    background: 'var(--modal-bg)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    'WebkitBackdropFilter': 'blur(24px) saturate(180%)',
                    border: '1px solid var(--modal-border)',
                    boxShadow:
                      '0 24px 64px var(--modal-shadow), 0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 var(--modal-inset)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={closeBuildingDetail}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full transition-all duration-200"
                    style={{
                      background: 'var(--glass-bg)',
                      backdropFilter: 'blur(12px)',
                      'WebkitBackdropFilter': 'blur(12px)',
                      border: '1px solid var(--glass-border)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--glass-bg)';
                    }}
                  >
                    <X className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
                  </button>

                  <BuildingDetailGallery
                    activeImage={activeSelectedImage}
                    buildingName={getBuildingName(selectedBuilding, locale)}
                    currentImageIndex={currentImageIndex}
                    imageLoading={imageLoading}
                    imageUrls={selectedBuildingImages}
                    isImageError={isImageError}
                    onImageError={handleImageError}
                    onImageLoad={() => setImageLoading(false)}
                    onNextImage={nextImage}
                    onPreviousImage={prevImage}
                    onSelectImage={setActiveImageIndex}
                    transitionDirection={imageTransitionDirection}
                  />

                  <BuildingDetailInfo
                    building={selectedBuilding}
                    formatDate={formatDate}
                    getTagKey={getTagKey}
                    locale={locale}
                    t={t}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
