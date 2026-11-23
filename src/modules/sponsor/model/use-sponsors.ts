'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SponsorRecordWire } from '@/modules/sponsor/model/sponsor-types';
import { isSponsorsArray } from '@/modules/sponsor/model/sponsor-validation';
import {
  SPONSOR_BROWSER_CACHE_TTL_MS,
  SPONSOR_REQUEST_TIMEOUT_MS,
} from '@/modules/sponsor/model/sponsor-limits';
import { dataApiUrl } from '@/shared/api/data-api-url';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';

/**
 * The sponsor endpoint is public and CORS-open; it still resolves to the online
 * MikData service by default. Set NEXT_PUBLIC_MIKDATA_ORIGIN in .env.local to point
 * the browser at a local instance (http://127.0.0.1:8787) during development.
 */
function sponsorApiUrl(): string {
  const origin = process.env.NEXT_PUBLIC_MIKDATA_ORIGIN?.trim();
  return origin ? `${origin}/api/sponsors` : dataApiUrl('/sponsors');
}

/**
 * Read the sponsor list from the public MikData API. Follows the ban/player module
 * pattern: a validated browser-side fetch with a cache TTL that mirrors the service's
 * freshness, and a manual retry escape hatch.
 */
export function useSponsors(errorMessage: string) {
  const [data, setData] = useState<SponsorRecordWire[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchSponsors = useCallback(
    async (force = false) => {
      const currentRequest = ++requestId.current;
      setIsLoading(true);
      setError(null);
      const result = await fetchValidatedJson<SponsorRecordWire[]>({
        url: sponsorApiUrl(),
        validate: isSponsorsArray,
        timeoutMs: SPONSOR_REQUEST_TIMEOUT_MS,
        // The service advertises stale-while-revalidate=3600; a stale empty snapshot
        // must not keep hiding sponsors for an hour, so bypass the HTTP cache and let
        // the 5-minute in-memory TTL (plus the retry button) own freshness instead.
        cache: 'no-store',
        browserCache: { ttlMs: SPONSOR_BROWSER_CACHE_TTL_MS, force },
        fallbackErrorMessage: errorMessage,
        invalidDataMessage: errorMessage,
      });
      if (currentRequest !== requestId.current) return;
      if (result.status === 'success') {
        setData(result.data);
        setError(null);
      } else {
        setData(null);
        setError(result.error);
      }
      setIsLoading(false);
    },
    [errorMessage],
  );

  useEffect(() => {
    void fetchSponsors();
    return () => {
      requestId.current++;
    };
  }, [fetchSponsors]);

  return {
    data,
    isLoading,
    error,
    retry: () => fetchSponsors(true),
  };
}
