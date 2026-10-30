'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { createContext, useContext, useEffect, useState } from 'react';

import { ACCENT_COLOR_STORAGE_KEY, DEFAULT_ACCENT_COLOR } from '@/shared/config/theme-config';
import {
  getAccentProperties,
  getDailyAccentColor,
  normalizeAccentColor,
} from '@/site/theme/lib/accent-color';

function applyAccentColor(color: string, isDailyColor: boolean) {
  for (const [name, value] of Object.entries(getAccentProperties(color))) {
    document.documentElement.style.setProperty(name, value);
  }
  document.documentElement.setAttribute('data-accent-mode', isDailyColor ? 'daily' : 'custom');
}

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setColor] = useState(DEFAULT_ACCENT_COLOR);
  const [isDailyColor, setIsDailyColor] = useState(true);

  useEffect(() => {
    const applyColor = (color: string, daily: boolean) => {
      setColor(color);
      setIsDailyColor(daily);
      applyAccentColor(color, daily);
    };
    // The head script has already applied the saved color before the first paint.
    applyColor(
      normalizeAccentColor(document.documentElement.style.getPropertyValue('--theme-seed')) ??
        getDailyAccentColor(),
      document.documentElement.getAttribute('data-accent-mode') !== 'custom',
    );
    const syncColor = (event: StorageEvent) => {
      if (event.key === ACCENT_COLOR_STORAGE_KEY || event.key === null) {
        const custom = normalizeAccentColor(event.newValue ?? '');
        applyColor(custom ?? getDailyAccentColor(), !custom);
      }
    };
    window.addEventListener('storage', syncColor);
    return () => window.removeEventListener('storage', syncColor);
  }, []);

  const setAccentColor = (value: string) => {
    const color = normalizeAccentColor(value);
    if (!color) return;
    setColor(color);
    setIsDailyColor(false);
    applyAccentColor(color, false);
    try {
      localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, color);
    } catch {
      // Keep the current tab usable when browser storage is unavailable.
    }
  };

  const resetAccentColor = () => {
    const color = getDailyAccentColor();
    setColor(color);
    setIsDailyColor(true);
    applyAccentColor(color, true);
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
      enableSystem={true}
      themes={['light', 'dark', 'system']}
    >
      <AccentColorContext value={{ accentColor, isDailyColor, setAccentColor, resetAccentColor }}>
        {children}
      </AccentColorContext>
    </NextThemesProvider>
  );
}
