'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { memo, Suspense, use, useLayoutEffect, ViewTransition } from 'react';
import { browser } from 'react-dom';
import type { BuildingCatalogQuery } from '@/modules/building/lib/building-catalog-query';
import { useBuildingCatalog } from '@/modules/building/model/use-building-catalog';
import { useBuildingCatalogQuery } from '@/modules/building/model/use-building-catalog-query';
import { useBuildings } from '@/modules/building/model/use-buildings';
import { BuildingCatalogControls } from '@/modules/building/ui/building-catalog-controls';
import { BuildingsContentArea } from '@/modules/building/ui/buildings-content-area';

export default function BuildingsPage({ initialSearch }: { initialSearch: string }) {
  const t = useTranslations('buildings');
  const commonT = useTranslations('common');
  const controls = useBuildingCatalogQuery(initialSearch);
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
      <Suspense fallback={null}>
        <CatalogLocationObserver onChange={controls.syncLocation} />
      </Suspense>
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
            <CatalogResults selection={controls.selection} />
          </div>
        </ViewTransition>
      </div>
    </div>
  );
}

// Query links can update the App Router without dispatching a popstate event.
function CatalogLocationObserver({ onChange }: { onChange: () => void }) {
  use(browser('The catalog uses the browser URL to select its results.'));
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useLayoutEffect(() => {
    if (
      pathname === window.location.pathname &&
      search === new URLSearchParams(window.location.search).toString()
    )
      onChange();
  }, [onChange, pathname, search]);
  return null;
}

// A draft keystroke only updates the controls until the URL change is committed.
const CatalogResults = memo(function CatalogResults({
  selection,
}: {
  selection: BuildingCatalogQuery;
}) {
  const t = useTranslations('buildings');
  const commonT = useTranslations('common');
  const { buildings, isLoading, error, fetchBuildings } = useBuildings();
  const catalog = useBuildingCatalog(buildings, selection, useLocale());
  return (
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
      t={t}
      loadingMessage={commonT('states.loading')}
      errorTitle={commonT('states.error')}
      emptyMessage={t('states.empty')}
      endMessage={t('states.end')}
    />
  );
});
