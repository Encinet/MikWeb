'use client';

import { ArrowUpDown, ChevronDown } from 'lucide-react';

import type { BuildingFilterId, BuildingSortKey } from '@/modules/building/lib/building-catalog';
import { isBuildingSortKey } from '@/modules/building/lib/building-catalog';
import { SearchField } from '@/shared/ui/form/search-field';
import { ContentBrowserHeader } from '@/shared/ui/page/content-browser-header';

interface BuildingCatalogOption<T extends string> {
  id: T;
  label: string;
}

interface BuildingCatalogControlsProps {
  title: string;
  clearSearchLabel: string;
  activeFilter: BuildingFilterId;
  filterOptions: BuildingCatalogOption<BuildingFilterId>[];
  onFilterChange: (filterId: BuildingFilterId) => void;
  onSearchQueryChange: (searchQuery: string) => void;
  onSortChange: (sortKey: BuildingSortKey) => void;
  searchPlaceholder: string;
  searchQuery: string;
  sortBy: BuildingSortKey;
  sortLabel: string;
  sortOptions: BuildingCatalogOption<BuildingSortKey>[];
}

export function BuildingCatalogControls({
  title,
  clearSearchLabel,
  activeFilter,
  filterOptions,
  onFilterChange,
  onSearchQueryChange,
  onSortChange,
  searchPlaceholder,
  searchQuery,
  sortBy,
  sortLabel,
  sortOptions,
}: BuildingCatalogControlsProps) {
  return (
    <ContentBrowserHeader
      title={title}
      search={
        <SearchField
          label={searchPlaceholder}
          clearLabel={clearSearchLabel}
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          onClear={() => onSearchQueryChange('')}
          placeholder={searchPlaceholder}
        />
      }
    >
      <div className="building-catalog-controls__filters">
        {filterOptions.map((filterOption) => {
          const isActive = activeFilter === filterOption.id;
          return (
            <button
              type="button"
              key={filterOption.id}
              onClick={() => onFilterChange(filterOption.id)}
              className={isActive ? 'is-active' : undefined}
              aria-pressed={isActive}
            >
              {filterOption.label}
            </button>
          );
        })}
      </div>
      <label className="building-catalog-controls__sort">
        <ArrowUpDown className="building-catalog-controls__sort-icon" aria-hidden="true" />
        <span className="sr-only">{sortLabel}</span>
        <select
          value={sortBy}
          onChange={(event) => {
            if (isBuildingSortKey(event.target.value)) onSortChange(event.target.value);
          }}
          className="building-catalog-controls__sort-select"
        >
          {sortOptions.map((sortOption) => (
            <option key={sortOption.id} value={sortOption.id}>
              {sortOption.label}
            </option>
          ))}
        </select>
        <ChevronDown className="building-catalog-controls__sort-chevron" aria-hidden="true" />
      </label>
    </ContentBrowserHeader>
  );
}
