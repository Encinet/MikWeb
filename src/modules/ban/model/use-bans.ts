'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BanItem } from '@/modules/ban/model/ban-types';
import { isBanItemArray } from '@/modules/ban/model/ban-types';
import { dataApiUrl } from '@/shared/api/data-api-url';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';

const BANS_BROWSER_CACHE_TTL_MS = 300_000;

export function useBans(errorMessage: string) {
  const [entries, setEntries] = useState<BanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchBans = useCallback(
    async (force = false) => {
      const currentRequest = ++requestId.current;
      setIsLoading(true);
      setError(null);
      const result = await fetchValidatedJson({
        url: dataApiUrl('/bans'),
        validate: isBanItemArray,
        timeoutMs: 15_000,
        browserCache: { ttlMs: BANS_BROWSER_CACHE_TTL_MS, force },
        fallbackErrorMessage: errorMessage,
        invalidDataMessage: errorMessage,
      });
      if (currentRequest !== requestId.current) return;
      if (result.status === 'success') {
        setEntries(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
    },
    [errorMessage],
  );

  useEffect(() => {
    void fetchBans();
    return () => {
      requestId.current++;
    };
  }, [fetchBans]);

  return { entries, isLoading, error, retry: () => fetchBans(true) };
}
