'use client';

import { Search, X } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';
import { useEffect, useRef } from 'react';
import { isImeComposing } from '@/shared/lib/keyboard-composition';

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

  useEffect(() => {
    const find = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        isImeComposing(event) ||
        !(event.ctrlKey || event.metaKey) ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLowerCase() !== 'f'
      ) {
        return;
      }

      const input = inputRef.current;
      if (
        !input ||
        input.matches(':disabled') ||
        input.readOnly ||
        input.closest('[inert], [hidden]') ||
        input.getClientRects().length === 0
      ) {
        return;
      }

      input.focus({ preventScroll: true });
      // Native modal dialogs can make the background unfocusable without an inert attribute.
      if (document.activeElement !== input) return;
      event.preventDefault();
      input.select();
      input.scrollIntoView({ block: 'center', inline: 'nearest' });
    };

    document.addEventListener('keydown', find);
    return () => document.removeEventListener('keydown', find);
  }, []);

  return (
    <div className="content-search-field">
      <Search className="content-search-field__icon" aria-hidden="true" />
      <input
        {...inputProps}
        ref={inputRef}
        type="search"
        aria-label={label}
        aria-keyshortcuts="Control+f Meta+f"
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
