'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { useBuildingCatalog } from '@/modules/building/model/use-building-catalog';
import { useBuildings } from '@/modules/building/model/use-buildings';
import { BuildingCatalogControls } from '@/modules/building/ui/building-catalog-controls';
import { BuildingsContentArea } from '@/modules/building/ui/buildings-content-area';

export default function BuildingsPage() {
  const t = useTranslations('buildings');
  const commonT = useTranslations('common');
  const locale = useLocale();
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

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  return (
    <div
      className="building-archive-page page-shell page-shell-stable print-page-title"
      data-print-title={t('title')}
    >
      <div className="building-archive-controls">
        <BuildingCatalogControls
          title={t('title')}
          clearSearchLabel={commonT('actions.clearSearch')}
          activeFilter={catalog.filter}
          filterOptions={catalog.filterOptions}
          onFilterChange={catalog.handleFilterChange}
          onSearchQueryChange={catalog.handleSearchChange}
          onSortChange={catalog.handleSortChange}
          searchPlaceholder={t('search.placeholder')}
          sortLabel={t('sort.label')}
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
            loadMore={catalog.loadMore}
            locale={locale}
            t={t}
            loadingMessage={commonT('states.loading')}
            errorTitle={commonT('states.error')}
            emptyMessage={t('states.empty')}
            endMessage={t('states.end')}
          />
        </div>
      </div>
    </div>
  );
}
