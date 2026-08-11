'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';

export function ThemeColor() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', resolvedTheme === 'light' ? '#edf1eb' : '#101816');
    }
  }, [resolvedTheme]);

  return null;
}
