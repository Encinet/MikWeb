'use client';

import { useEffect } from 'react';
import { scheduleBackgroundWork } from '@/shared/lib/background-work';

/** Keep the import callback stable; an actual interaction always bypasses this policy. */
export function useBackgroundPrefetch(load: () => Promise<unknown>) {
  useEffect(
    () =>
      scheduleBackgroundWork(async () => {
        await load();
        return false;
      }),
    [load],
  );
}
