'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isBuildingArray } from '@/modules/building/model/building-validation';
import { dataApiUrl } from '@/shared/api/data-api-url';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';
import type { BuildingCatalogSnapshot } from './building-types';
import { BuildingsStateContext } from './buildings-state-context';

const BUILDINGS_CACHE_TTL_MS = 300_000;

export function BuildingsProvider({
  children,
  initialSnapshot,
}: {
  children: ReactNode;
  initialSnapshot: BuildingCatalogSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isLoading, setIsLoading] = useState(false);
  const generation = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const previousInitialSnapshot = useRef(initialSnapshot);

  useEffect(() => {
    if (previousInitialSnapshot.current === initialSnapshot) return;
    previousInitialSnapshot.current = initialSnapshot;
    // RSC refreshes preserve this provider. Accept new server data without rolling
    // back a newer browser refresh or replacing usable data with a server failure.
    if (
      initialSnapshot.updatedAt === null ||
      (snapshot.updatedAt !== null && initialSnapshot.updatedAt < snapshot.updatedAt)
    )
      return;
    generation.current++;
    inFlight.current = null;
    setSnapshot(initialSnapshot);
    setIsLoading(false);
  }, [initialSnapshot, snapshot.updatedAt]);

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
        snapshot.updatedAt !== null &&
        Date.now() - snapshot.updatedAt < BUILDINGS_CACHE_TTL_MS
      )
        return Promise.resolve();
      const requestGeneration = ++generation.current;
      setIsLoading(true);
      const request = (async () => {
        const result = await fetchValidatedJson({
          url: dataApiUrl('/buildings'),
          validate: isBuildingArray,
          timeoutMs: 15_000,
          cache: force ? 'reload' : 'default',
          browserCache: { force, ttlMs: BUILDINGS_CACHE_TTL_MS },
          fallbackErrorMessage: 'building_catalog_unavailable',
        });
        if (generation.current !== requestGeneration) return;
        setSnapshot((previous) =>
          result.status === 'success'
            ? { buildings: result.data, error: null, updatedAt: Date.now() }
            : { ...previous, error: result.error },
        );
        setIsLoading(false);
        inFlight.current = null;
      })();
      inFlight.current = request;
      return request;
    },
    [snapshot.updatedAt],
  );

  return (
    <BuildingsStateContext
      value={{
        buildings: snapshot.buildings,
        buildingCount: snapshot.buildings.length,
        error: snapshot.error,
        lastUpdatedAt: snapshot.updatedAt,
        isLoading,
        fetchBuildings,
      }}
    >
      {children}
    </BuildingsStateContext>
  );
}
