'use client';

import { Search, X } from 'lucide-react';
import { motion } from 'motion/react';
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
      className="wiki-search-box"
      initial={false}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ ...spring.gentle, delay: 0.2 }}
    >
      <div className="wiki-search-box__surface">
        <Search className="wiki-search-box__icon" aria-hidden="true" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onChange(event.target.value)}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          placeholder={placeholder}
          className="wiki-search-box__input"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={onClear}
            className="wiki-search-box__clear"
            aria-label={clearSearchLabel}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
