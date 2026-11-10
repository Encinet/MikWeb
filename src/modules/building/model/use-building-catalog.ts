'use client';

import { useMemo, useState } from 'react';
import {
  BUILDINGS_PAGE_SIZE,
  filterBuildings,
  sortBuildings,
} from '@/modules/building/lib/building-catalog';
import type { BuildingCatalogQuery } from '@/modules/building/lib/building-catalog-query';
import type { Building } from '@/modules/building/model/building-types';

/** Catalog derivation and pagination are independent of routing, labels and input handling. */
export function useBuildingCatalog(
  buildings: Building[],
  locale: string,
  selection: BuildingCatalogQuery,
) {
  const { query, filter, sort } = selection;
  const key = JSON.stringify([query, filter, sort]);
  const [pagination, setPagination] = useState({ key, count: BUILDINGS_PAGE_SIZE });
  if (pagination.key !== key) setPagination({ key, count: BUILDINGS_PAGE_SIZE });
  const count = pagination.key === key ? pagination.count : BUILDINGS_PAGE_SIZE;
  const filtered = useMemo(
    () => sortBuildings(filterBuildings(buildings, filter, query, locale), sort, locale),
    [buildings, filter, query, sort, locale],
  );
  const displayed = useMemo(() => filtered.slice(0, count), [filtered, count]);

  return {
    filtered,
    displayed,
    hasMore: count < filtered.length,
    loadMore() {
      setPagination((previous) => ({
        key,
        count: Math.min(
          (previous.key === key ? previous.count : BUILDINGS_PAGE_SIZE) + BUILDINGS_PAGE_SIZE,
          filtered.length,
        ),
      }));
    },
  };
}
