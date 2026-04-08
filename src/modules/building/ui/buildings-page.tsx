'use client';

import { Building2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import Masonry from 'react-masonry-css';

import type { BuildingFilterId, BuildingSortKey } from '@/modules/building/lib/building-catalog';
import {
  BUILDING_MASONRY_BREAKPOINT_COLUMNS,
  BUILDINGS_PAGE_SIZE,
  filterBuildings,
  getBuildingId,
  getBuildingImages,
  sortBuildings,
} from '@/modules/building/lib/building-catalog';
import type { Building, LocalizedText } from '@/modules/building/model/building-types';
import { getLocalizedText } from '@/modules/building/model/building-types';
import { useBuildings } from '@/modules/building/model/use-buildings';
import { BuildingCard } from '@/modules/building/ui/building-card';
import { BuildingCatalogControls } from '@/modules/building/ui/building-catalog-controls';
import { BuildingDetailsDialog } from '@/modules/building/ui/building-details-dialog';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { SectionMessage } from '@/shared/ui/feedback/async-state';

function BuildingsLoadingState({ message }: { message: string }) {
  return (
    <div className="py-20 text-center">
      <div
        className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
        style={{ borderColor: 'var(--theme-accent-purple)', borderTopColor: 'transparent' }}
      />
      <p className="mt-6 text-lg" style={{ color: 'var(--theme-text-muted)' }}>
        {message}
      </p>
    </div>
  );
}

interface BuildingsStatusMessageProps {
  bodyText: string;
  iconColor: string;
  title?: string;
}

function BuildingsStatusMessage({ bodyText, iconColor, title }: BuildingsStatusMessageProps) {
  return <SectionMessage body={bodyText} icon={Building2} iconColor={iconColor} title={title} />;
}

export default function BuildingsPage() {
  const t = useTranslations('buildings');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const { buildings, isLoading, error, fetchBuildings } = useBuildings();
  const [buildingFilter, setBuildingFilter] = useState<BuildingFilterId>('all');
  const [displayedCount, setDisplayedCount] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<BuildingSortKey>('random');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageTransitionDirection, setImageTransitionDirection] = useState<-1 | 1>(1);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const mounted = useHasMounted();
  const selectedBuildingImages = useMemo(() => {
    return selectedBuilding ? getBuildingImages(selectedBuilding) : [];
  }, [selectedBuilding]);
  const activeSelectedImage = selectedBuildingImages[currentImageIndex];

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = selectedBuilding ? 'hidden' : 'unset';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
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
    { id: 'all', label: t('filters.options.all') },
    { id: 'original', label: t('filters.options.original') },
    { id: 'derivative', label: t('filters.options.derivative') },
    { id: 'replica', label: t('filters.options.replica') },
  ];

  const sortOptions: { id: BuildingSortKey; label: string }[] = [
    { id: 'date-desc', label: t('sort.options.dateDesc') },
    { id: 'date-asc', label: t('sort.options.dateAsc') },
    { id: 'name-asc', label: t('sort.options.nameAsc') },
    { id: 'name-desc', label: t('sort.options.nameDesc') },
    { id: 'random', label: t('sort.options.random') },
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

  const syncImageLoadingState = (imageUrl: string | undefined) => {
    if (!imageUrl || imageErrors.has(imageUrl)) {
      setImageLoading(false);
      return;
    }

    const image = new globalThis.Image();
    image.src = imageUrl;
    setImageLoading(!image.complete);
  };

  const setActiveImageIndex = (
    imageIndex: number,
    imageUrls: string[],
    direction: -1 | 1 = imageIndex >= currentImageIndex ? 1 : -1,
  ) => {
    const nextImageUrl = imageUrls[imageIndex];
    syncImageLoadingState(nextImageUrl);
    setImageTransitionDirection(direction);
    setCurrentImageIndex(imageIndex);
  };

  const openBuildingDetail = (building: Building) => {
    syncImageLoadingState(getBuildingImages(building)[0]);
    setSelectedBuilding(building);
    setImageTransitionDirection(1);
    setCurrentImageIndex(0);
  };

  const closeBuildingDetail = () => {
    setSelectedBuilding(null);
    setImageLoading(false);
    setImageTransitionDirection(1);
    setCurrentImageIndex(0);
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
    <div className="page-shell page-shell-stable">
      <div className="page-shell-content max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-linear-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm border border-purple-400/30 shadow-lg">
              <Building2 className="w-8 h-8" style={{ color: 'var(--theme-accent-purple)' }} />
            </div>
            <h1
              className="text-4xl sm:text-5xl font-bold"
              style={{ color: 'var(--theme-text-heading)' }}
            >
              {t('hero.title')}
            </h1>
          </div>
          <p
            className="text-base sm:text-lg max-w-2xl mx-auto"
            style={{ color: 'var(--theme-text-muted-soft)' }}
          >
            {t('hero.description')}
          </p>
        </div>

        <BuildingCatalogControls
          activeFilter={buildingFilter}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onSearchQueryChange={handleSearchQueryChange}
          onSortChange={handleSortChange}
          searchPlaceholder={t('search.placeholder')}
          searchQuery={searchQuery}
          sortBy={sortBy}
          sortOptions={sortOptions}
        />

        <div className="page-state-region">
          {isLoading ? (
            <BuildingsLoadingState message={t('states.loading')} />
          ) : error ? (
            <BuildingsStatusMessage
              bodyText={error}
              iconColor="var(--theme-accent-purple)"
              title={commonT('states.error')}
            />
          ) : filteredBuildings.length === 0 ? (
            <BuildingsStatusMessage
              bodyText={t('states.empty')}
              iconColor="var(--theme-text-faint)"
            />
          ) : (
            <InfiniteScroll
              dataLength={displayedBuildings.length}
              next={loadMore}
              hasMore={hasMore}
              loader={
                <div className="py-8 text-center">
                  <div
                    className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
                    style={{
                      borderColor: 'var(--theme-accent-purple)',
                      borderTopColor: 'transparent',
                    }}
                  />
                </div>
              }
              endMessage={
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                    {t('states.end')}
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
                {displayedBuildings.map((building) => (
                  <BuildingCard
                    key={getBuildingId(building)}
                    building={building}
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
      </div>

      <BuildingDetailsDialog
        activeImage={activeSelectedImage}
        building={selectedBuilding}
        currentImageIndex={currentImageIndex}
        formatDate={formatDate}
        getTagKey={getTagKey}
        imageLoading={imageLoading}
        imageTransitionDirection={imageTransitionDirection}
        imageUrls={selectedBuildingImages}
        isImageError={isImageError}
        locale={locale}
        mounted={mounted}
        onClose={closeBuildingDetail}
        onImageError={handleImageError}
        onImageLoad={() => setImageLoading(false)}
        onNextImage={nextImage}
        onPreviousImage={prevImage}
        onSelectImage={setActiveImageIndex}
        t={t}
      />
    </div>
  );
}
