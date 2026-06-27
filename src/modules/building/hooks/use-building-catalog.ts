'use client';

import { useMemo, useState } from 'react';

import type { BuildingFilterId, BuildingSortKey } from '@/modules/building/lib/building-catalog';
import {
  BUILDINGS_PAGE_SIZE,
  filterBuildings,
  sortBuildings,
} from '@/modules/building/lib/building-catalog';
import type { Building } from '@/modules/building/model/building-types';

export interface BuildingCatalogState {
  filter: BuildingFilterId;
  sort: BuildingSortKey;
  query: string;
  filtered: Building[];
  displayed: Building[];
  hasMore: boolean;
  filterOptions: { id: BuildingFilterId; label: string }[];
  sortOptions: { id: BuildingSortKey; label: string }[];
  handleFilterChange: (id: BuildingFilterId) => void;
  handleSearchChange: (nextQuery: string) => void;
  handleSortChange: (key: BuildingSortKey) => void;
  loadMore: () => void;
}

export function useBuildingCatalog(
  buildings: Building[],
  locale: string,
  labels: {
    all: string;
    original: string;
    derivative: string;
    replica: string;
    dateDesc: string;
    dateAsc: string;
    nameAsc: string;
    nameDesc: string;
    random: string;
  },
): BuildingCatalogState {
  const [filter, setFilter] = useState<BuildingFilterId>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<BuildingSortKey>('random');
  const [count, setCount] = useState(BUILDINGS_PAGE_SIZE);

  const filtered = useMemo(() => {
    return sortBuildings(filterBuildings(buildings, filter, query, locale), sort, locale);
  }, [buildings, filter, query, sort, locale]);

  const displayed = useMemo(() => filtered.slice(0, count), [filtered, count]);
  const hasMore = count < filtered.length;

  const handleFilterChange = (id: BuildingFilterId) => {
    setFilter(id);
    setCount(BUILDINGS_PAGE_SIZE);
  };

  const handleSearchChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setCount(BUILDINGS_PAGE_SIZE);
  };

  const handleSortChange = (key: BuildingSortKey) => {
    setSort(key);
    setCount(BUILDINGS_PAGE_SIZE);
  };

  const loadMore = () => {
    setCount((prev) => Math.min(prev + BUILDINGS_PAGE_SIZE, filtered.length));
  };

  const filterOptions: { id: BuildingFilterId; label: string }[] = useMemo(
    () => [
      { id: 'all', label: labels.all },
      { id: 'original', label: labels.original },
      { id: 'derivative', label: labels.derivative },
      { id: 'replica', label: labels.replica },
    ],
    [labels],
  );

  const sortOptions: { id: BuildingSortKey; label: string }[] = useMemo(
    () => [
      { id: 'date-desc', label: labels.dateDesc },
      { id: 'date-asc', label: labels.dateAsc },
      { id: 'name-asc', label: labels.nameAsc },
      { id: 'name-desc', label: labels.nameDesc },
      { id: 'random', label: labels.random },
    ],
    [labels],
  );

  return {
    filter,
    sort,
    query,
    filtered,
    displayed,
    hasMore,
    filterOptions,
    sortOptions,
    handleFilterChange,
    handleSearchChange,
    handleSortChange,
    loadMore,
  };
}
