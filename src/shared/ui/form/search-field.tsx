'use client';

import { Search, X } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';
import { useRef } from 'react';

interface SearchFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'className' | 'aria-label' | 'value' | 'defaultValue'
  > {
  label: string;
  clearLabel: string;
  value: string;
  onClear: () => void;
}

export function SearchField({ label, clearLabel, onClear, ...inputProps }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="content-search-field">
      <Search className="content-search-field__icon" aria-hidden="true" />
      <input
        {...inputProps}
        ref={inputRef}
        type="search"
        aria-label={label}
        className="content-search-field__input"
      />
      {inputProps.value.length > 0 ? (
        <button
          type="button"
          className="content-search-field__clear"
          aria-label={clearLabel}
          onClick={() => {
            onClear();
            inputRef.current?.focus({ preventScroll: true });
          }}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
