'use client';

import type { ReactNode } from 'react';
import { useCallback, useRef, useState } from 'react';

import { dataApiUrl } from '@/shared/api/data-api-url';
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
  const buildingsRef = useRef<Building[]>([]);

  const fetchBuildings = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    setIsLoading(true);
    const result = await fetchValidatedJson({
      url: dataApiUrl('/buildings'),
      validate: isBuildingArray,
      timeoutMs: BUILDINGS_REQUEST_TIMEOUT_MS,
      cache: force ? 'reload' : 'default',
      browserCache: {
        force,
        ttlMs: BUILDINGS_CACHE_TTL_MS,
      },
      fallbackErrorMessage: 'Failed to load buildings',
    });

    if (result.status === 'success') {
      buildingsRef.current = result.data;
      setBuildings(result.data);
      setError(null);
      setLastUpdatedAt(Date.now());
    } else {
      if (result.status === 'network-error') {
        console.error('Failed to fetch buildings:', result.cause);
      }
      setError(result.error);
      if (buildingsRef.current.length === 0) {
        setBuildings([]);
      }
    }
    setIsLoading(false);
  }, []);

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
