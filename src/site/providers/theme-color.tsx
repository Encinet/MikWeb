'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { useAccentColor } from '@/site/providers/theme-provider';

export function ThemeColor() {
  const { resolvedTheme } = useTheme();
  const { accentColor } = useAccentColor();

  useEffect(() => {
    if (!resolvedTheme || !accentColor) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', getComputedStyle(document.body).backgroundColor);
    }
  }, [resolvedTheme, accentColor]);

  return null;
}
