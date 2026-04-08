'use client';

import { Search, SlidersHorizontal } from 'lucide-react';

import type { BuildingFilterId, BuildingSortKey } from '@/modules/building/lib/building-catalog';
import { isBuildingSortKey } from '@/modules/building/lib/building-catalog';

interface BuildingCatalogOption<T extends string> {
  id: T;
  label: string;
}

interface BuildingCatalogControlsProps {
  activeFilter: BuildingFilterId;
  filterOptions: BuildingCatalogOption<BuildingFilterId>[];
  onFilterChange: (filterId: BuildingFilterId) => void;
  onSearchQueryChange: (searchQuery: string) => void;
  onSortChange: (sortKey: BuildingSortKey) => void;
  searchPlaceholder: string;
  searchQuery: string;
  sortBy: BuildingSortKey;
  sortOptions: BuildingCatalogOption<BuildingSortKey>[];
}

export function BuildingCatalogControls({
  activeFilter,
  filterOptions,
  onFilterChange,
  onSearchQueryChange,
  onSortChange,
  searchPlaceholder,
  searchQuery,
  sortBy,
  sortOptions,
}: BuildingCatalogControlsProps) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:gap-4">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 z-10 h-5 w-5 -translate-y-1/2"
            style={{ color: 'var(--theme-text-muted)' }}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="relative z-0 w-full rounded-lg border px-4 py-3 pr-4 pl-12 backdrop-blur-md transition-all focus:border-purple-400/50 focus:outline-none"
            style={{
              color: 'var(--theme-text-primary)',
              fontSize: '0.875rem',
              background: 'var(--theme-surface-glass)',
              borderColor: 'var(--theme-border-glass)',
            }}
          />
        </div>

        <div className="relative sm:w-64">
          <SlidersHorizontal
            className="pointer-events-none absolute top-1/2 left-4 z-10 h-5 w-5 -translate-y-1/2"
            style={{ color: 'var(--theme-text-muted)' }}
          />
          <select
            value={sortBy}
            onChange={(event) => {
              if (isBuildingSortKey(event.target.value)) {
                onSortChange(event.target.value);
              }
            }}
            className="relative z-0 w-full cursor-pointer appearance-none rounded-lg border px-4 py-3 pr-10 pl-12 backdrop-blur-md transition-all focus:border-purple-400/50 focus:outline-none"
            style={{
              color: 'var(--theme-text-primary)',
              fontSize: '0.875rem',
              background: 'var(--theme-surface-glass)',
              borderColor: 'var(--theme-border-glass)',
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

      <div className="mb-8 flex flex-wrap justify-center gap-2 px-2 sm:mb-12 sm:gap-3">
        {filterOptions.map((filterOption) => (
          <button
            type="button"
            key={filterOption.id}
            onClick={() => onFilterChange(filterOption.id)}
            className="rounded-lg px-4 py-2.5 text-xs font-medium backdrop-blur-md transition-all duration-300 sm:px-6 sm:text-sm"
            style={{
              color:
                activeFilter === filterOption.id
                  ? 'var(--theme-text-filter-active)'
                  : 'var(--theme-text-muted-soft)',
              background:
                activeFilter === filterOption.id
                  ? 'var(--theme-surface-filter-active)'
                  : 'var(--theme-surface-glass)',
              border:
                activeFilter === filterOption.id
                  ? '1px solid var(--theme-border-filter-active)'
                  : '1px solid var(--theme-border-glass)',
              boxShadow:
                activeFilter === filterOption.id
                  ? '0 10px 15px -3px var(--theme-shadow-filter-active)'
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
