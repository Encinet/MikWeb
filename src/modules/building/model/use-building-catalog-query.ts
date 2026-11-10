'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import {
  addTransitionType,
  startTransition,
  useCallback,
  useEffect,
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
  const params = useSearchParams();
  const pathname = usePathname();
  const isCatalog = pathname.endsWith('/buildings');
  const routeSearch = params.toString();
  const [catalogSearch, setCatalogSearch] = useState(routeSearch);
  // Intercepted galleries keep the catalog mounted underneath a different URL.
  if (isCatalog && catalogSearch !== routeSearch) setCatalogSearch(routeSearch);
  const selection = readBuildingCatalogQuery(
    new URLSearchParams(isCatalog ? routeSearch : catalogSearch),
  );
  const [query, setQuery] = useState(selection.query);
  const pendingQuery = useRef<{ value: string; href: string } | null>(null);
  const queryTimer = useRef<number | null>(null);
  const clearQueryTimer = useCallback(() => {
    if (queryTimer.current !== null) window.clearTimeout(queryTimer.current);
    queryTimer.current = null;
  }, []);

  useEffect(() => {
    if (!isCatalog) {
      clearQueryTimer();
      pendingQuery.current = null;
      setQuery(selection.query);
      return;
    }
    const current = readBuildingCatalogQuery(new URLSearchParams(window.location.search));
    if (selection.query !== current.query) return;
    if (pendingQuery.current !== null) {
      if (pendingQuery.current.href === window.location.href) {
        if (pendingQuery.current.value === selection.query) pendingQuery.current = null;
        return;
      }
      // A link or router navigation supersedes the draft, just like Back/Forward.
      clearQueryTimer();
      pendingQuery.current = null;
    }
    setQuery(selection.query);
  }, [clearQueryTimer, isCatalog, selection.query]);

  useEffect(() => {
    const restore = () => {
      clearQueryTimer();
      pendingQuery.current = null;
      setQuery(readBuildingCatalogQuery(new URLSearchParams(window.location.search)).query);
    };
    window.addEventListener('popstate', restore);
    return () => {
      clearQueryTimer();
      window.removeEventListener('popstate', restore);
    };
  }, [clearQueryTimer]);

  const update = (patch: Partial<BuildingCatalogQuery>, history: 'push' | 'replace') => {
    const url = new URL(window.location.href);
    if (pendingQuery.current && pendingQuery.current.href !== url.href) {
      pendingQuery.current = null;
      setQuery(isCatalog ? readBuildingCatalogQuery(url.searchParams).query : selection.query);
      return;
    }
    if (!url.pathname.endsWith('/buildings')) return;
    const current = readBuildingCatalogQuery(url.searchParams);
    const next = { ...current, query: pendingQuery.current?.value ?? current.query, ...patch };
    url.search = writeBuildingCatalogQuery(url.searchParams, next).toString();
    if (url.href === window.location.href) {
      pendingQuery.current = null;
      return;
    }
    if (pendingQuery.current) pendingQuery.current.href = url.href;
    startTransition(() => {
      addTransitionType('building-catalog');
      if (history === 'push') window.history.pushState(null, '', url);
      else window.history.replaceState(null, '', url);
    });
  };

  return {
    selection,
    query,
    handleSearchChange(query: string) {
      setQuery(query);
      pendingQuery.current = { value: query, href: window.location.href };
      clearQueryTimer();
      // Keep keystrokes urgent and coalesce URL updates instead of navigating on every key.
      queryTimer.current = window.setTimeout(() => {
        queryTimer.current = null;
        update({ query }, 'replace');
      }, 180);
    },
    handleFilterChange(filter: BuildingFilterId) {
      clearQueryTimer();
      update({ filter }, 'push');
    },
    handleSortChange(sort: BuildingSortKey) {
      clearQueryTimer();
      update({ sort }, 'push');
    },
  };
}
