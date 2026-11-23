'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { loadSponsors } from '@/modules/sponsor/lib/sponsor-api';
import type { Sponsor } from '@/modules/sponsor/model/sponsor-types';

type SponsorsState = { status: 'loading' | 'error' } | { status: 'success'; data: Sponsor[] };

export function useSponsors(errorMessage: string) {
  const [state, setState] = useState<SponsorsState>({ status: 'loading' });
  const requestId = useRef(0);

  const fetchSponsors = useCallback(
    async (force = false) => {
      const currentRequest = ++requestId.current;
      setState({ status: 'loading' });

      const result = await loadSponsors(errorMessage, force);
      if (currentRequest === requestId.current) {
        setState(result.status === 'success' ? result : { status: 'error' });
      }
    },
    [errorMessage],
  );

  useEffect(() => {
    void fetchSponsors();
    return () => {
      requestId.current++;
    };
  }, [fetchSponsors]);

  return { state, retry: () => void fetchSponsors(true) };
}
