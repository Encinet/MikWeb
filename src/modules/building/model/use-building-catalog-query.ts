'use client';

import {
  addTransitionType,
  startTransition,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { BuildingFilterId, BuildingSortKey } from '@/modules/building/lib/building-catalog';
import type { BuildingCatalogQuery } from '@/modules/building/lib/building-catalog-query';
import {
  readBuildingCatalogQuery,
  writeBuildingCatalogQuery,
} from '@/modules/building/lib/building-catalog-query';

export function useBuildingCatalogQuery() {
  const [catalogSearch, setCatalogSearch] = useState<string | null>(null);
  const selection = useMemo(
    () => readBuildingCatalogQuery(new URLSearchParams(catalogSearch ?? '')),
    [catalogSearch],
  );
  const [query, setQuery] = useState('');
  const pendingQuery = useRef<{ value: string; href: string } | null>(null);
  const queryTimer = useRef<number | null>(null);
  const clearTimer = useCallback(() => {
    if (queryTimer.current !== null) window.clearTimeout(queryTimer.current);
    queryTimer.current = null;
  }, []);

  const syncLocation = useCallback(
    (discardDraft = false) => {
      const { href, pathname, search } = window.location;
      const draft = pendingQuery.current;
      if (pathname.endsWith('/buildings')) {
        setCatalogSearch(search);
        if (!discardDraft && draft?.href === href) return;
        setQuery(new URLSearchParams(search).get('q') ?? '');
      } else if (draft) {
        // A gallery keeps the last committed catalog visible underneath it.
        setQuery(new URL(draft.href).searchParams.get('q') ?? '');
      }
      pendingQuery.current = null;
      clearTimer();
    },
    [clearTimer],
  );

  useLayoutEffect(() => {
    syncLocation();
    const restore = () => syncLocation(true);
    window.addEventListener('popstate', restore);
    return () => {
      clearTimer();
      pendingQuery.current = null;
      window.removeEventListener('popstate', restore);
    };
  }, [clearTimer, syncLocation]);

  const update = (patch: Partial<BuildingCatalogQuery>, history: 'push' | 'replace') => {
    const url = new URL(window.location.href);
    const draft = pendingQuery.current;
    if (!url.pathname.endsWith('/buildings') || (draft && draft.href !== url.href)) {
      syncLocation(true);
      return;
    }
    clearTimer();
    const current = readBuildingCatalogQuery(url.searchParams);
    const next = { ...current, query: draft?.value ?? current.query, ...patch };
    url.search = writeBuildingCatalogQuery(url.searchParams, next).toString();
    pendingQuery.current = null;
    startTransition(() => {
      addTransitionType('building-catalog');
      if (url.href !== window.location.href) {
        if (history === 'push') window.history.pushState(null, '', url);
        else window.history.replaceState(null, '', url);
      }
      setCatalogSearch(url.search);
      setQuery(next.query);
    });
  };

  return {
    selection,
    query,
    ready: catalogSearch !== null,
    syncLocation,
    handleSearchChange(query: string) {
      setQuery(query);
      pendingQuery.current = { value: query, href: window.location.href };
      clearTimer();
      queryTimer.current = window.setTimeout(() => update({ query }, 'replace'), 180);
    },
    handleFilterChange(filter: BuildingFilterId) {
      update({ filter }, 'push');
    },
    handleSortChange(sort: BuildingSortKey) {
      update({ sort }, 'push');
    },
  };
}
