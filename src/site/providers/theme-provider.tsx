'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { ACCENT_COLOR_STORAGE_KEY, DEFAULT_ACCENT_COLOR } from '@/shared/config/theme-config';
import {
  getAccentProperties,
  getDailyAccentColor,
  normalizeAccentColor,
} from '@/site/theme/lib/accent-color';

const AccentColorContext = createContext<{
  accentColor: string;
  isDailyColor: boolean;
  setAccentColor: (color: string) => void;
  resetAccentColor: () => string;
} | null>(null);

export function useAccentColor() {
  const context = useContext(AccentColorContext);
  if (!context) throw new Error('useAccentColor requires ThemeProvider');
  return context;
}

export function ThemeProvider({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce: string | undefined;
}) {
  const [accentColor, setColor] = useState(DEFAULT_ACCENT_COLOR);
  const [isDailyColor, setIsDailyColor] = useState(true);
  const applyColor = useCallback((color: string, daily: boolean) => {
    setColor(color);
    setIsDailyColor(daily);
    const { style } = document.documentElement;
    // The document and its startup script set the same palette for this seed.
    if (style.getPropertyValue('--theme-seed') === color) return;
    for (const [name, value] of Object.entries(getAccentProperties(color))) {
      style.setProperty(name, value);
    }
  }, []);

  useEffect(() => {
    let custom: string | null = null;
    try {
      custom = normalizeAccentColor(localStorage.getItem(ACCENT_COLOR_STORAGE_KEY) ?? '');
    } catch {
      /* Storage is optional. */
    }
    applyColor(custom ?? getDailyAccentColor(), custom === null);
    const syncColor = (event: StorageEvent) => {
      if (event.key === ACCENT_COLOR_STORAGE_KEY || event.key === null) {
        const custom = normalizeAccentColor(event.newValue ?? '');
        applyColor(custom ?? getDailyAccentColor(), !custom);
      }
    };
    window.addEventListener('storage', syncColor);
    return () => window.removeEventListener('storage', syncColor);
  }, [applyColor]);

  const setAccentColor = (value: string) => {
    const color = normalizeAccentColor(value);
    if (!color) return;
    applyColor(color, false);
    try {
      localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, color);
    } catch {
      // Keep the current tab usable when browser storage is unavailable.
    }
  };

  const resetAccentColor = () => {
    const color = getDailyAccentColor();
    applyColor(color, true);
    try {
      localStorage.removeItem(ACCENT_COLOR_STORAGE_KEY);
    } catch {
      // The daily color still applies in the current tab without browser storage.
    }
    return color;
  };

  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      nonce={nonce}
      scriptProps={{
        // Client mounts apply the theme through effects; server HTML needs the bootstrap.
        type: typeof window === 'undefined' ? 'text/javascript' : 'text/plain',
      }}
    >
      <AccentColorContext
        value={{
          accentColor,
          isDailyColor,
          setAccentColor,
          resetAccentColor,
        }}
      >
        {children}
      </AccentColorContext>
    </NextThemesProvider>
  );
}
