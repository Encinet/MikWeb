'use client';

import { AnimatePresence, motion } from 'motion/react';

import type { WikiSearchResult } from '@/modules/wiki/model/wiki-section-types';

interface WikiSearchResultsProps {
  emptyDescription: string;
  emptyTitle: string;
  isSearching: boolean;
  onOpenResult: (result: WikiSearchResult) => void;
  results: WikiSearchResult[];
  resultsCountLabel: string;
  resultsLabel: string;
}

export function WikiSearchResults({
  emptyDescription,
  emptyTitle,
  isSearching,
  onOpenResult,
  results,
  resultsCountLabel,
  resultsLabel,
}: WikiSearchResultsProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {isSearching ? (
        <motion.div
          key={`search-${resultsCountLabel}`}
          initial={false}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{
            opacity: 0,
            y: -8,
            filter: 'blur(4px)',
            transition: {
              duration: 0.16,
              ease: [0.4, 0, 1, 1] as [number, number, number, number],
            },
          }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="wiki-search-results__header">
            <p className="wiki-search-results__label">{resultsLabel}</p>
            <h2 className="wiki-search-results__title">{resultsCountLabel}</h2>
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
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
