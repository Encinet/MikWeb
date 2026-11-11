'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ViewTransition } from 'react';
import { useBuildingCatalog } from '@/modules/building/model/use-building-catalog';
import { useBuildingCatalogQuery } from '@/modules/building/model/use-building-catalog-query';
import { useBuildings } from '@/modules/building/model/use-buildings';
import { BuildingCatalogControls } from '@/modules/building/ui/building-catalog-controls';
import { BuildingsContentArea } from '@/modules/building/ui/buildings-content-area';

export default function BuildingsPage() {
  const t = useTranslations('buildings');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const { buildings, isLoading, error, fetchBuildings } = useBuildings();

  const controls = useBuildingCatalogQuery();
  const catalog = useBuildingCatalog(buildings, locale, controls.selection);
  const filterOptions = (['all', 'original', 'derivative', 'replica'] as const).map((id) => ({
    id,
    label: t(`filters.options.${id}`),
  }));
  const sortOptions = [
    { id: 'date-desc' as const, label: t('sort.options.dateDesc') },
    { id: 'date-asc' as const, label: t('sort.options.dateAsc') },
    { id: 'name-asc' as const, label: t('sort.options.nameAsc') },
    { id: 'name-desc' as const, label: t('sort.options.nameDesc') },
    { id: 'random' as const, label: t('sort.options.random') },
  ];

  return (
    <div
      className="building-archive-page page-shell page-shell-stable print-page-title"
      data-print-title={t('title')}
    >
      <div className="building-archive-controls">
        <BuildingCatalogControls
          title={t('title')}
          clearSearchLabel={commonT('actions.clearSearch')}
          activeFilter={controls.selection.filter}
          filterOptions={filterOptions}
          onFilterChange={controls.handleFilterChange}
          onSearchQueryChange={controls.handleSearchChange}
          onSortChange={controls.handleSortChange}
          searchPlaceholder={t('search.placeholder')}
          sortLabel={t('sort.label')}
          searchQuery={controls.query}
          sortBy={controls.selection.sort}
          sortOptions={sortOptions}
        />
      </div>

      <div className="building-archive-shell page-shell-content">
        <ViewTransition
          default="none"
          update={{ 'building-catalog': 'building-results', default: 'none' }}
        >
          <div className="page-state-region">
            <BuildingsContentArea
              buildings={catalog.displayed}
              hasMore={catalog.hasMore}
              isLoading={isLoading}
              error={error}
              onRetry={() => void fetchBuildings({ force: true })}
              retryLabel={commonT('actions.retry')}
              errorMessage={t('states.loadFailed')}
              filteredBuildings={catalog.filtered}
              loadMore={catalog.loadMore}
              locale={locale}
              t={t}
              loadingMessage={commonT('states.loading')}
              errorTitle={commonT('states.error')}
              emptyMessage={t('states.empty')}
              endMessage={t('states.end')}
            />
          </div>
        </ViewTransition>
      </div>
    </div>
  );
}
