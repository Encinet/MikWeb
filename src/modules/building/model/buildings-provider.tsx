'use client';

import { useLocale } from 'next-intl';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  getPublicBuildingCatalogUrl,
  isLocalizedBuildingCatalogResponse,
  resolveBuildingCatalog,
  type BuildingCatalogResponse,
} from '@/modules/building/model/building-api';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';
import type { AppLocale } from '@/shared/i18n/routing';
import type { LocalizedBuilding } from './building-types';
import { BuildingsStateContext } from './buildings-state-context';

const BUILDINGS_CACHE_TTL_MS = 300_000;

interface BuildingsProviderProps {
  children: ReactNode;
  initialCatalog?: BuildingCatalogResponse<string> | null;
}

interface BuildingsCatalogState {
  buildings: LocalizedBuilding[];
  error: string | null;
  updatedAt: number | null;
}

export function BuildingsProvider(props: BuildingsProviderProps) {
  const locale = useLocale();
  return <LocalizedBuildingsProvider key={locale} locale={locale} {...props} />;
}

function LocalizedBuildingsProvider({
  children,
  initialCatalog,
  locale,
}: BuildingsProviderProps & { locale: AppLocale }) {
  const [catalog, setCatalog] = useState<BuildingsCatalogState>(() => ({
    buildings: initialCatalog ? resolveBuildingCatalog(initialCatalog) : [],
    error: null,
    updatedAt: initialCatalog ? Date.now() : null,
  }));
  const [isLoading, setIsLoading] = useState(!initialCatalog);
  const generation = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);

  useLayoutEffect(
    () => () => {
      generation.current++;
      inFlight.current = null;
      setIsLoading(false);
    },
    [],
  );

  const fetchBuildings = useCallback(
    ({ force = false }: { force?: boolean } = {}) => {
      if (!force && inFlight.current) return inFlight.current;
      if (
        !force &&
        catalog.updatedAt !== null &&
        Date.now() - catalog.updatedAt < BUILDINGS_CACHE_TTL_MS
      )
        return Promise.resolve();
      const requestGeneration = ++generation.current;
      setIsLoading(true);
      const request = (async () => {
        const result = await fetchValidatedJson({
          url: getPublicBuildingCatalogUrl({ locale }),
          validate: isLocalizedBuildingCatalogResponse,
          timeoutMs: 15_000,
          cache: force ? 'reload' : 'default',
          browserCache: { force, ttlMs: BUILDINGS_CACHE_TTL_MS },
          fallbackErrorMessage: 'building_catalog_unavailable',
        });
        if (generation.current !== requestGeneration) return;
        setCatalog((previous) =>
          result.status === 'success'
            ? {
                buildings: resolveBuildingCatalog(result.data),
                error: null,
                updatedAt: Date.now(),
              }
            : { ...previous, error: result.error },
        );
        setIsLoading(false);
        inFlight.current = null;
      })();
      inFlight.current = request;
      return request;
    },
    [locale, catalog.updatedAt],
  );

  useEffect(() => {
    void fetchBuildings();
  }, [fetchBuildings]);

  return (
    <BuildingsStateContext
      value={{
        buildings: catalog.buildings,
        error: catalog.error,
        isLoading,
        fetchBuildings,
      }}
    >
      {children}
    </BuildingsStateContext>
  );
}
