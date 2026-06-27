'use client';

import { ArrowUpDown, Search } from 'lucide-react';

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
    <div className="building-catalog-controls">
      {/* Search + Sort row — clean, minimal */}
      <div className="building-catalog-controls__bar">
        <div className="flex-1 relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 h-4 w-4"
            style={{ color: 'var(--theme-text-dim)' }}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="w-full bg-transparent border-0 border-b py-2.5 pl-7 pr-2 text-sm outline-none transition-colors"
            style={{
              color: 'var(--theme-text-primary)',
              borderColor: 'var(--theme-border-glass)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--theme-accent-green-strong)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--theme-border-glass)';
            }}
          />
        </div>

        <div className="shrink-0 relative">
          <select
            value={sortBy}
            onChange={(event) => {
              if (isBuildingSortKey(event.target.value)) {
                onSortChange(event.target.value);
              }
            }}
            className="cursor-pointer appearance-none bg-transparent border-0 border-b py-2.5 pl-1 pr-6 text-sm outline-none transition-colors"
            style={{
              color: 'var(--theme-text-muted-soft)',
              borderColor: 'var(--theme-border-glass)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--theme-accent-green-strong)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--theme-border-glass)';
            }}
          >
            {sortOptions.map((sortOption) => (
              <option key={sortOption.id} value={sortOption.id}>
                {sortOption.label}
              </option>
            ))}
          </select>
          <ArrowUpDown
            className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 h-3.5 w-3.5"
            style={{ color: 'var(--theme-text-dim)' }}
          />
        </div>
      </div>

      {/* Filter tags */}
      <div className="building-catalog-controls__filters">
        {filterOptions.map((filterOption) => {
          const isActive = activeFilter === filterOption.id;
          return (
            <button
              type="button"
              key={filterOption.id}
              onClick={() => onFilterChange(filterOption.id)}
              style={{
                color: isActive ? 'var(--theme-accent-green-strong)' : 'var(--theme-text-muted)',
                background: isActive ? 'rgba(121, 184, 111, 0.1)' : 'transparent',
                border: isActive ? '1px solid rgba(121, 184, 111, 0.2)' : '1px solid transparent',
              }}
            >
              {filterOption.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
