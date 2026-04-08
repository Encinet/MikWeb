'use client';

import { AnimatePresence, motion } from 'framer-motion';

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
          <div className="mb-6">
            <p
              className="mb-2 text-sm uppercase tracking-[0.2em]"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              {resultsLabel}
            </p>
            <h2
              className="text-2xl font-semibold sm:text-3xl"
              style={{ color: 'var(--theme-text-heading)' }}
            >
              {resultsCountLabel}
            </h2>
          </div>

          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result) => (
                <button
                  type="button"
                  key={`${result.sectionId}-${result.slug || result.heading}`}
                  onClick={() => onOpenResult(result)}
                  className="w-full rounded-xl p-4 text-left transition-all"
                  style={{
                    background: 'var(--theme-surface-glass-light)',
                    border: '1px solid var(--theme-border-glass-light)',
                  }}
                >
                  <p
                    className="mb-2 text-xs uppercase tracking-[0.16em]"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    {result.path}
                  </p>
                  <h3
                    className="mb-2 text-lg font-semibold"
                    style={{ color: 'var(--theme-text-heading)' }}
                  >
                    {result.heading}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--theme-text-muted-strong)' }}
                  >
                    {result.snippet}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl p-6 sm:p-8"
              style={{
                background: 'var(--theme-surface-glass-light)',
                border: '1px solid var(--theme-border-glass-light)',
              }}
            >
              <h3
                className="mb-3 text-xl font-semibold"
                style={{ color: 'var(--theme-text-heading)' }}
              >
                {emptyTitle}
              </h3>
              <p style={{ color: 'var(--theme-text-muted-strong)' }}>{emptyDescription}</p>
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
