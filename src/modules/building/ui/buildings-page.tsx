'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';

import type { Building, LocalizedText } from '@/modules/building/model/building-types';
import { getLocalizedText } from '@/modules/building/model/building-types';
import { useBuildingCatalog } from '@/modules/building/model/use-building-catalog';
import { useBuildingDialog } from '@/modules/building/model/use-building-dialog';
import { useBuildings } from '@/modules/building/model/use-buildings';
import { BuildingCatalogControls } from '@/modules/building/ui/building-catalog-controls';
import { BuildingDetailsDialog } from '@/modules/building/ui/building-details-dialog';
import { BuildingsContentArea } from '@/modules/building/ui/buildings-content-area';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';

export default function BuildingsPage() {
  const t = useTranslations('buildings');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const mounted = useHasMounted();
  const { buildings, isLoading, error, fetchBuildings } = useBuildings();

  const catalog = useBuildingCatalog(buildings, locale, {
    all: t('filters.options.all'),
    original: t('filters.options.original'),
    derivative: t('filters.options.derivative'),
    replica: t('filters.options.replica'),
    dateDesc: t('sort.options.dateDesc'),
    dateAsc: t('sort.options.dateAsc'),
    nameAsc: t('sort.options.nameAsc'),
    nameDesc: t('sort.options.nameDesc'),
    random: t('sort.options.random'),
  });

  const dialog = useBuildingDialog();

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  const formatDate = (timestamp: number | string) => {
    const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTagKey = (building: Building, tag: LocalizedText) => {
    return `${building.buildDate}-${getLocalizedText(tag, locale)}`;
  };

  return (
    <div className="building-archive-page page-shell page-shell-stable">
      <div className="building-archive-controls">
        <BuildingCatalogControls
          activeFilter={catalog.filter}
          filterOptions={catalog.filterOptions}
          onFilterChange={catalog.handleFilterChange}
          onSearchQueryChange={catalog.handleSearchChange}
          onSortChange={catalog.handleSortChange}
          searchPlaceholder={t('search.placeholder')}
          searchQuery={catalog.query}
          sortBy={catalog.sort}
          sortOptions={catalog.sortOptions}
        />
      </div>

      <div className="building-archive-shell page-shell-content">
        <div className="page-state-region">
          <BuildingsContentArea
            buildings={catalog.displayed}
            hasMore={catalog.hasMore}
            isLoading={isLoading}
            error={error}
            filteredCount={catalog.filtered.length}
            isImageError={dialog.isImageError}
            onImageError={dialog.handleImageError}
            onOpenBuilding={dialog.open}
            loadMore={catalog.loadMore}
            locale={locale}
            t={t}
            loadingMessage={t('states.loading')}
            errorTitle={commonT('states.error')}
            emptyMessage={t('states.empty')}
            endMessage={t('states.end')}
          />
        </div>
      </div>

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
        t={t}
      />
    </div>
  );
}
