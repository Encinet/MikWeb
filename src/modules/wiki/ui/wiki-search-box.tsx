'use client';

import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import type React from 'react';

import { spring } from '@/modules/wiki/lib/wiki-browser-config';

interface WikiSearchBoxProps {
  clearSearchLabel: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onCompositionEnd: (event: React.CompositionEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
  placeholder: string;
  searchQuery: string;
}

export function WikiSearchBox({
  clearSearchLabel,
  onChange,
  onClear,
  onCompositionEnd,
  onCompositionStart,
  placeholder,
  searchQuery,
}: WikiSearchBoxProps) {
  return (
    <motion.div
      className="mb-6 sm:mb-8"
      initial={false}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ ...spring.gentle, delay: 0.2 }}
    >
      <div className="relative mx-auto max-w-3xl">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2"
          style={{ color: 'var(--theme-text-muted)' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onChange(event.target.value)}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          placeholder={placeholder}
          className="w-full rounded-xl border px-12 py-3.5 pr-12 backdrop-blur-md transition-all focus:outline-none"
          style={{
            color: 'var(--theme-text-primary)',
            background: 'var(--theme-surface-glass)',
            borderColor: 'var(--theme-border-glass)',
            boxShadow: 'var(--theme-shadow-card)',
          }}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-2 transition-colors"
            style={{ color: 'var(--theme-text-muted-soft)' }}
            aria-label={clearSearchLabel}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
