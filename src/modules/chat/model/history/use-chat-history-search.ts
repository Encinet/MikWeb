'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HistorySearchPage, HistorySearchQuery } from '../../lib/history/chat-history-search';
import { searchChatHistory } from '../../lib/history/chat-history-search';

const EMPTY: HistorySearchPage = { messages: [], hasMore: false };
export function useChatHistorySearch(query: HistorySearchQuery | null) {
  const [state, setState] = useState({
    query: null as HistorySearchQuery | null,
    page: EMPTY,
    loading: false,
    failed: false,
  });
  const generation = useRef(0);
  const worker = useRef<Worker | null>(null);
  const request = useRef<((query: HistorySearchQuery, append: boolean) => void) | null>(null);
  useEffect(() => {
    const version = ++generation.current;
    let active = true;
    let pending = false;
    if (!query) {
      setState({ query: null, page: EMPTY, loading: false, failed: false });
      return;
    }
    setState({ query, page: EMPTY, loading: true, failed: false });
    let task: Worker | null = null;
    try {
      if (typeof Worker !== 'undefined')
        task = new Worker(new URL('../../worker/chat-search.worker.ts', import.meta.url));
    } catch {
      /* Restricted browsers use the same bounded scan on the main thread. */
    }
    worker.current = task;
    const run = (value: HistorySearchQuery, append: boolean) => {
      if (pending) return;
      pending = true;
      setState((previous) => ({ ...previous, query, loading: true, failed: false }));
      const done = (page: HistorySearchPage) => {
        pending = false;
        if (!active || version !== generation.current) return;
        setState((previous) => ({
          query,
          page: append
            ? { ...page, messages: [...previous.page.messages, ...page.messages] }
            : page,
          loading: false,
          failed: false,
        }));
      };
      const fail = () => {
        pending = false;
        if (active && version === generation.current)
          setState((previous) => ({ ...previous, loading: false, failed: true }));
      };
      if (task) {
        task.onmessage = (event) => (event.data.error ? fail() : done(event.data.page));
        task.onerror = fail;
        task.postMessage(value);
      } else
        void searchChatHistory(value, () => active && version === generation.current).then(
          done,
          fail,
        );
    };
    request.current = run;
    const timer = setTimeout(() => run(query, false), 150);
    return () => {
      active = false;
      clearTimeout(timer);
      task?.terminate();
      worker.current = null;
      request.current = null;
    };
  }, [query]);
  const valid = state.query === query;
  const more = useCallback(() => {
    if (query && valid && state.page.hasMore && !state.loading)
      request.current?.({ ...query, before: state.page.before }, true);
  }, [query, valid, state]);
  const retry = useCallback(() => {
    if (query) request.current?.(query, false);
  }, [query]);
  return {
    page: valid ? state.page : EMPTY,
    loading: Boolean(query) && (!valid || state.loading),
    failed: valid && state.failed,
    more,
    retry,
  };
}
