'use client';

import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';
import type { Building } from './building-types';
import { isBuildingArray } from './building-types';
import { BuildingsStateContext } from './buildings-state-context';

const BUILDINGS_CACHE_TTL_MS = 300_000;
const BUILDINGS_REQUEST_TIMEOUT_MS = 15_000;

export function BuildingsProvider({ children }: { children: ReactNode }) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const fetchBuildings = useCallback(async () => {
    const now = Date.now();

    if (isLoading || (lastUpdatedAt && now - lastUpdatedAt < BUILDINGS_CACHE_TTL_MS)) {
      return;
    }

    setIsLoading(true);

    const result = await fetchValidatedJson({
      url: '/api/buildings',
      validate: isBuildingArray,
      timeoutMs: BUILDINGS_REQUEST_TIMEOUT_MS,
      cache: 'default',
      fallbackErrorMessage: 'Failed to load buildings',
    });

    if (result.status === 'success') {
      setBuildings(result.data);
      setError(null);
      setLastUpdatedAt(now);
    } else {
      if (result.status === 'network-error') {
        console.error('Failed to fetch buildings:', result.cause);
      }
      setError(result.error);
      setBuildings([]);
    }
    setIsLoading(false);
  }, [isLoading, lastUpdatedAt]);

  return (
    <BuildingsStateContext.Provider
      value={{
        buildings,
        buildingCount: buildings.length,
        isLoading,
        error,
        fetchBuildings,
        lastUpdatedAt,
      }}
    >
      {children}
    </BuildingsStateContext.Provider>
  );
}
