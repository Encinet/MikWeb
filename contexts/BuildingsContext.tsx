'use client';

import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { BuildingsContext } from '@/contexts/buildings-context';
import { fetchValidatedJson } from '@/lib/clientApi';
import type { Building } from '@/lib/types';
import { isBuildingArray } from '@/lib/types';

const BUILDINGS_CACHE_TTL_MS = 300_000;
const BUILDINGS_REQUEST_TIMEOUT_MS = 15_000;

export function BuildingsContextProvider({ children }: { children: ReactNode }) {
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
    <BuildingsContext.Provider
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
    </BuildingsContext.Provider>
  );
}
