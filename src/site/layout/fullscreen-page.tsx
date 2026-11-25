'use client';

import { useLayoutEffect } from 'react';

export function FullscreenPage({ mode }: { mode: 'chat' | 'map' }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.fullscreenPage = mode;

    // Next keeps the DOM of previously visited routes but disconnects their layout effects.
    return () => {
      if (root.dataset.fullscreenPage === mode) delete root.dataset.fullscreenPage;
    };
  }, [mode]);

  return null;
}
