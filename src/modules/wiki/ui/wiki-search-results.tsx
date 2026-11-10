'use client';

import type { WikiSearchResult } from '@/modules/wiki/model/wiki-section-types';

interface WikiSearchResultsProps {
  emptyDescription: string;
  emptyTitle: string;
  onOpenResult: (result: WikiSearchResult) => void;
  results: WikiSearchResult[];
  resultsCountLabel: string;
  resultsLabel: string;
}

export function WikiSearchResults({
  emptyDescription,
  emptyTitle,
  onOpenResult,
  results,
  resultsCountLabel,
  resultsLabel,
}: WikiSearchResultsProps) {
  return (
    <div className="wiki-search-results">
      <div className="wiki-search-results__header">
        <p className="wiki-search-results__label">{resultsLabel}</p>
        <h2 className="wiki-search-results__title" aria-live="polite" aria-atomic="true">
          {resultsCountLabel}
        </h2>
      </div>

      {results.length > 0 ? (
        <div className="wiki-search-results__list">
          {results.map((result) => (
            <button
              type="button"
              key={`${result.sectionId}-${result.slug || result.heading}`}
              onClick={() => onOpenResult(result)}
              className="wiki-search-results__item"
            >
              <p className="wiki-search-results__path">{result.path}</p>
              <h3 className="wiki-search-results__heading">{result.heading}</h3>
              <p className="wiki-search-results__snippet">{result.snippet}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="wiki-search-results__empty">
          <h3>{emptyTitle}</h3>
          <p>{emptyDescription}</p>
        </div>
      )}
    </div>
  );
}
