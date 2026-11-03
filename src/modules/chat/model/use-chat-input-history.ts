'use client';

import { useState } from 'react';
import type { ChatInputHistoryEntry } from '@/modules/chat/model/chat-input-history';

interface InputHistoryBrowse {
  entries: ChatInputHistoryEntry[];
  index: number;
}

export function useChatInputHistory(history: ChatInputHistoryEntry[], value: string) {
  const [browse, setBrowse] = useState<InputHistoryBrowse | null>(null);
  const selected = browse?.entries[browse.index];
  const active = Boolean(
    selected &&
      selected.text === value &&
      history.some((entry) => entry.id === selected.id && entry.text === selected.text),
  );

  return {
    active,
    reset: () => setBrowse(null),
    recall(direction: -1 | 1): string | null {
      if (!active && (value !== '' || direction === 1)) return null;
      // New arrivals cannot move a browsing cursor; deleted/revoked records cannot be recalled.
      const available = new Map(history.map((entry) => [entry.id, entry.text]));
      const entries =
        active && browse
          ? browse.entries.filter((entry) => available.get(entry.id) === entry.text)
          : history;
      if (!entries.length) return null;
      const index =
        active && selected
          ? entries.findIndex((entry) => entry.id === selected.id)
          : entries.length;
      const next = Math.max(0, index + direction);
      if (next >= entries.length) {
        setBrowse(null);
        return '';
      }
      setBrowse({ entries, index: next });
      return entries[next].text;
    },
  };
}
