'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { useId } from 'react';

/** Search and player selection share one nonmodal workspace surface and keyboard behavior. */
export function ChatPanel({
  id,
  open,
  inputRef,
  title,
  onClose,
  children,
}: {
  id: string;
  open: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useTranslations('common');
  const titleId = useId();
  const keyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
      if (event.key === 'Enter') event.preventDefault();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-chat-panel-result]'),
    );
    const index = event.target instanceof HTMLButtonElement ? buttons.indexOf(event.target) : -1;
    if (event.target === inputRef.current) {
      if (event.key === 'ArrowDown' && buttons[0]) {
        event.preventDefault();
        buttons[0].focus();
      }
      return;
    }
    if (index < 0) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      (buttons[index - 1] ?? inputRef.current)?.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      buttons[Math.min(index + 1, buttons.length - 1)]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      (event.key === 'Home' ? buttons[0] : buttons.at(-1))?.focus();
    }
  };

  return (
    <aside
      id={id}
      className="chat-panel"
      aria-labelledby={titleId}
      hidden={!open}
      onKeyDown={keyboard}
    >
      <header className="chat-panel-header">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="chat-icon-button"
          onClick={onClose}
          aria-label={t('actions.close')}
          title={t('actions.close')}
        >
          <X size={19} aria-hidden="true" />
        </button>
      </header>
      <div className="chat-panel-body">{children}</div>
    </aside>
  );
}

export function ChatPanelSearch({
  inputRef,
  label,
  placeholder,
  query,
  onChange,
  onSubmit,
  maxLength,
  describedBy,
  enterKeyHint = 'search',
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  placeholder: string;
  query: string;
  onChange: (query: string) => void;
  onSubmit: () => void;
  maxLength: number;
  describedBy?: string;
  enterKeyHint?: 'search' | 'go';
}) {
  const commonT = useTranslations('common');
  const inputId = useId();
  return (
    <search aria-label={label}>
      <form
        className="chat-panel-search chat-input-surface"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          aria-describedby={describedBy}
          value={query}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint={enterKeyHint}
        />
        {query ? (
          <button
            type="button"
            className="chat-icon-button chat-panel-clear"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            aria-label={commonT('actions.clearSearch')}
            title={commonT('actions.clearSearch')}
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
      </form>
    </search>
  );
}
