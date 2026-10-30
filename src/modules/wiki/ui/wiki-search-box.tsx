'use client';

import type React from 'react';
import { SearchField } from '@/shared/ui/form/search-field';

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
    <SearchField
      label={placeholder}
      clearLabel={clearSearchLabel}
      value={searchQuery}
      onChange={(event) => onChange(event.target.value)}
      onClear={onClear}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
      placeholder={placeholder}
    />
  );
}
